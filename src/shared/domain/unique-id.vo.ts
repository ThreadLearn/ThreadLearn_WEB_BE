import { ValueObject } from './value-object';
import mongoose from 'mongoose';

interface UniqueIdProps {
  value: string;
}

export class UniqueId extends ValueObject<UniqueIdProps> {
  private constructor(props: UniqueIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id?: string): UniqueId {
    const value = id && mongoose.isValidObjectId(id)
      ? id
      : new mongoose.Types.ObjectId().toString();
    return new UniqueId({ value });
  }

  public static from(id: string): UniqueId {
    if (!mongoose.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
    return new UniqueId({ value: id });
  }
}
