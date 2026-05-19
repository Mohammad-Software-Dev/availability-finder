import { Request, Response, NextFunction } from "express";
import { peopleQuerySchema } from "./people.schemas.js";
import { getAllPeople, getAvailableDates } from "./people.service.js";

export function handleGetPeople(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { date } = peopleQuerySchema.parse(req.query);
    const data = getAllPeople(date);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export function handleGetPeopleDates(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.status(200).json({ dates: getAvailableDates() });
  } catch (error) {
    next(error);
  }
}
