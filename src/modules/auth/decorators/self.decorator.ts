import { SetMetadata } from '@nestjs/common';

export const SELF_PARAM_KEY = 'selfParam';

/** Marks a route as "self or admin". `paramName` is the route param holding the user id. */
export const Self = (paramName = 'id') =>
  SetMetadata(SELF_PARAM_KEY, paramName);
