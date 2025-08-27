import { BaseCreate, BaseEntity } from "./common";

export type User = BaseEntity & {
  username: string;
  password: string;
  first_password: string;
}

export type CreateUserRequest = BaseCreate<User>;