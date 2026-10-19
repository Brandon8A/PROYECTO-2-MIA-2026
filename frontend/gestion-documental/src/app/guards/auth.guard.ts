import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth";

export const AuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService)

  const router = inject(Router)

  //Condicional que verifica si existe un inicio de sesion activo
  if (auth.tieneSesion()) {
    return true;
  }

  //Si no hay un inicio de sesion activo, redirige al login y envia la ruta en la que se quedo el usuario
  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url//ruta en la que se quedo el usuario antes de ser redirigido al login
    }
  })
}
