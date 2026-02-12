import { HttpInterceptorFn } from '@angular/common/http';

export const userAgentInterceptor: HttpInterceptorFn = (req, next) => {
  const cloneReq = req.clone({
    setHeaders: {
      'User-Agent':
        'RS3-DPS-Calculator - Bridging the usability gap for OSRS players to learn RS3, no git yet but my discord is squirrelzor',
    },
  });

  return next(cloneReq);
};
