import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { CommentEntity, CommentTargetType } from '../../domain/entities/comment.entity';
import { CommentListResult, ICommentRepository } from '../../domain/interfaces/comment.repository';
import { Comment } from '../../models/comment.model';
import { CommentMapper } from '../mapper/comment.mapper';

@Injectable()
export class MongoCommentRepository implements ICommentRepository {
  async findById(id: string): Promise<CommentEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Comment.findById(id);
    if (!doc || doc.status === 'deleted') return null;
    return CommentMapper.toEntity(doc);
  }

  async findViewById(id: string): Promise<unknown | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Comment.findById(id).populate('userId', 'firstName lastName avatarUrl').lean();
    return CommentMapper.formatView(doc);
  }

  async listByTarget(
    targetType: CommentTargetType,
    targetId: string,
    page: number,
    limit: number,
  ): Promise<CommentListResult> {
    const skip = (page - 1) * limit;
    // Deleted rows remain visible as tombstones so their reply thread keeps
    // its context. Mutating a deleted comment is still blocked by findById.
    const query = { targetType, targetId, parentId: null };
    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);
    return {
      data: comments.map((comment) => CommentMapper.formatView(comment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listReplies(commentId: string): Promise<unknown[]> {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const parent = await Comment.findById(commentId);
    if (!parent) throw new NotFoundError('Comment not found.');
    const replies = await Comment.find({ parentId: commentId })
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ createdAt: 1 })
      .lean();
    return replies.map((reply) => CommentMapper.formatView(reply));
  }

  async create(comment: CommentEntity): Promise<CommentEntity> {
    const props = comment.toProps();
    if (props.parentId) {
      if (!mongoose.isValidObjectId(props.parentId)) throw new BadRequestError('Invalid parentId format.');
      const parent = await Comment.findById(props.parentId);
      if (!parent || parent.status === 'deleted') {
        throw new BadRequestError('Parent comment not found or has been deleted.');
      }
      if (parent.parentId) {
        throw new BadRequestError('Replies can only be added to a top-level comment.');
      }
      if (parent.targetType !== props.targetType || String(parent.targetId) !== props.targetId) {
        throw new BadRequestError('Parent comment does not belong to the same target.');
      }
    }
    const doc = await Comment.create(CommentMapper.toPersistence(comment));
    return CommentMapper.toEntity(doc);
  }

  async update(comment: CommentEntity): Promise<CommentEntity> {
    const doc = await Comment.findByIdAndUpdate(
      comment.id,
      CommentMapper.toPersistence(comment),
      { new: true },
    );
    if (!doc) throw new NotFoundError('Comment not found.');
    return CommentMapper.toEntity(doc);
  }

  async findReplyNotificationTarget(parentId: string, replyingUserId: string): Promise<string | null> {
    if (!mongoose.isValidObjectId(parentId)) return null;
    const parent = await Comment.findById(parentId).select('userId');
    const parentUserId = parent?.userId?.toString();
    return parentUserId && parentUserId !== replyingUserId ? parentUserId : null;
  }
}
