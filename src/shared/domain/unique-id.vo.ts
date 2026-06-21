import { ValueObject } from './value-object';
import { randomBytes } from 'crypto';

interface UniqueIdProps {
  value: string;
}

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export class UniqueId extends ValueObject<UniqueIdProps> {
  private constructor(props: UniqueIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id?: string): UniqueId {
    const value = id && OBJECT_ID_PATTERN.test(id)
      ? id
      : randomBytes(12).toString('hex');
    return new UniqueId({ value });
  }

  public static from(id: string): UniqueId {
    if (!OBJECT_ID_PATTERN.test(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
    return new UniqueId({ value: id });
  }
}
