import type * as core from "express-serve-static-core/index.d.ts";
import type { Request } from 'express';

export interface JwtPayload {
  sub: number; // user id
  email: string;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

export interface ArticleRow {
  id: number;
  user_id: number;
  url: string;
  archived: number;  // 0/1
  favorited: number; // 0/1
  date_added: string;
  updated_at: string;
}

export interface RequestWithData<P extends core.ParamsDictionary = {}> extends Request {
  userId?: number;
  userEmail?: string;
  headers: { authorization?: string };
  params: P;
}
