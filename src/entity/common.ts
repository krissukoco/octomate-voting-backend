export type BaseEntity = {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export type BaseCreate<T extends BaseEntity> = Omit<T, 'id'|'created_at'|'updated_at'>;

export type Pagination = {
  page: number;
  size: number;
  last_page: number;
  total: number;
}

export type ListResponse<T extends any> = {
  list: T[];
}

export type PaginatedResponse<T extends any> = ListResponse<T> & {
  pagination: Pagination;
}