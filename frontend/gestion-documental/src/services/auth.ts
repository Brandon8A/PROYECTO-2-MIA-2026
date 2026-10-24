import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RespuestaLogin } from '../pages/login/models/respuesta-login.model';
import { CredencialesLogin } from '../pages/login/models/credenciales-login.model'
import { Observable, tap } from 'rxjs';
import { UsuarioAutenticado } from '../pages/login/models/usuario-autenticado.model';
import { HttpHeaders } from '@angular/common/http';

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
  iniciarSesion(credenciales: CredencialesLogin): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(`${this.apiURL}/login`, credenciales).pipe(
      tap((respuesta) => {
        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('usuario', JSON.stringify(respuesta.usuario));
      })
    );
  }

  /**
   * Funcion que obtiene el token de autenticacion almacenado en localstorage
   * @returns retorna el token almacenado en localstorage
   */
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Funcion que 'eliminia' la informacion del usuario y el token de autenticacion almacenados en localstorage
   */
  cerrarSesion(): void {
    const token = this.obtenerToken()

    if (token) {
      const headers = new HttpHeaders({Authorization: `Bearer ${token}`})

      this.http.post(`${this.apiURL}/logout`, {}, { headers }).subscribe({
        error: (error) => {
          console.error('No se pudo registrar el cierre de sesión:', error)
        }
      })
    }

    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  /**
   * Funcion que obtiene la informacion del usuario autenticado almacenada en localstorage
   * @returns UsuarioAutenticado si se existe un inicio de sesión, de lo contrario retornara null
   */
  obtenerUsuario(): UsuarioAutenticado | null {
    const usuarioGuardado = localStorage.getItem('usuario');

    //Condicional para saber si existe un usuario autenticado, de lo contrario retorna null
    if (!usuarioGuardado) {
      return null;
    }

    try {
      return JSON.parse(usuarioGuardado) as UsuarioAutenticado;//Intentar parsear el usuario guardado en localstorage
    } catch {
      localStorage.removeItem('usuario');
      return null;
    }
  }

  /**
   * Funcion que verifica si existe un inicio de sesion activo
   * @returns retorna true si existe un inicio de sesion activo, si no retorna false
   */
  tieneSesion(): boolean {
    const token = this.obtenerToken();

    //Condicional para saber si existe un token
    if (!token) {
      return false;
    }

    // Comprobar la fecha de expiración del JWT
    try {
      const partePayload = token.split('.')[1];//Decodificar el payload del token JWT

      //Condicional para saber si existe un payload en el token
      if (!partePayload) {
        return false;
      }

      //Decodificar el payload del token JWT y parsearlo a un objeto JSON
      const payloadBase64 = partePayload.replace(/-/g, '+').replace(/_/g, '/');

      const payload = JSON.parse(
        atob(payloadBase64)
      ) as { exp?: number };

      //Condicional para saber si el token ha expirado, si ha expirado se cierra la sesion y retorna false
      if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
        this.cerrarSesion();
        return false;
      }

      return true;
    } catch {
      this.cerrarSesion();
      return false;
    }
  }

  /**
   * Funcion que verifica si el usuario autenticado tiene alguno de los roles permitidos
   * @param rolesPermitidos parametro que contiene un arreglo de roles permitidos para acceder a una ruta
   * @returns retorna true si el usuario autenticado tiene alguno de los roles pertmitidos
   */
  tieneRol(rolesPermitidos: string[]): boolean {
    const usuario = this.obtenerUsuario();

    return this.tieneSesion() && usuario !== null && rolesPermitidos.includes(usuario.rol);
  }

}
