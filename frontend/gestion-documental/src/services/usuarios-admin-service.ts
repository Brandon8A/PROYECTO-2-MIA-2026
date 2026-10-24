import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { DatosCrearUsuario } from '../pages/admin/models/datos-crear-usuario.model';
import { RespuestaUsuarios } from '../pages/admin/models/respuesta-usuarios.model';
import { RespuestaUsuario } from '../pages/admin/models/respuesta-usuario.model';

export type DatosActualizarUsuario = Partial<Omit<DatosCrearUsuario, 'password'>> & {
  password?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosAdminService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'http://localhost:3000/api/usuarios';

  private obtenerOpciones() {
    const token = this.auth.obtenerToken();

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token ?? ''}`
      })
    };
  }

  listar(): Observable<RespuestaUsuarios> {
    return this.http.get<RespuestaUsuarios>(this.apiUrl, this.obtenerOpciones())
  }

  crear(datos: DatosCrearUsuario): Observable<RespuestaUsuario> {
    return this.http.post<RespuestaUsuario>(
      this.apiUrl,
      datos,
      this.obtenerOpciones()
    );
  }

  actualizar(
    id: string,
    datos: DatosActualizarUsuario
  ): Observable<RespuestaUsuario> {
    return this.http.put<RespuestaUsuario>(
      `${this.apiUrl}/${id}`,
      datos,
      this.obtenerOpciones()
    );
  }

  cambiarEstado(
    id: string,
    estado: 'activo' | 'inactivo'
  ): Observable<RespuestaUsuario> {
    return this.http.patch<RespuestaUsuario>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      this.obtenerOpciones()
    );
  }
}
