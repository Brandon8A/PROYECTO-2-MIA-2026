import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth";

export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (!auth.tieneSesion()) {
    return router.createUrlTree(['/login'])
  }

  const rolesPermitidos = route. data['roles'] as string[] | undefined

  if (!rolesPermitidos || auth.tieneRol(rolesPermitidos)) {
    return true
  }

  return router.createUrlTree(['/acceso-denegado'])
}
