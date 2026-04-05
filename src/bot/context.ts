import { Context } from 'grammy';
import type { IUser } from '../models/user.model.js';

export interface CustomContextFlavor {
  dbUser: IUser;
}

export type BotContext = Context & CustomContextFlavor;
