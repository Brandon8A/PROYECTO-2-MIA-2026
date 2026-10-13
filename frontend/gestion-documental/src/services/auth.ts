import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RespuestaLogin } from '../pages/login/models/respuesta-login.model';
import { CredencialesLogin } from '../pages/login/models/credenciales-login.model'
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiURL = 'http://localhost:3000/api/auth'

  /**
   * Funcion que permite iniciar sesion en la pagina web, enviando credenciales al backend y obteniendo
   * un token de autenticacion y la informacion del usuario autenticado
   * @param credenciales Parametro que tiene las credenciales con las que se va a iniciar sesion
   * @returns un observable que contiene la respuesta del backend con el token de autenticacion
   */
  iniciarSesion(credenciales: CredencialesLogin): Observable<RespuestaLogin>{
    return this.http.post<RespuestaLogin>(`${this.apiURL}/login`, credenciales).pipe(
      tap((respuesta) => {
        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('usuario', JSON.stringify(respuesta.usuario));
      })
    );
  }

  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }
}
