import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth';
import { Observable } from 'rxjs';
import { UsuarioAdmin } from '../pages/admins-usuarios/model/usuario-admin.model';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {

  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)

  private readonly apiURL = 'http://localhost:3000/api/usuarios'

  private obtenerOpciones(){
    const token = this.auth.obtenerToken()

    return {headers: new HttpHeaders({
      Authorization: `Bearer ${token}`
    })}
  }

  listar(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(this.apiURL, this.obtenerOpciones())
  }

  obtenerPorId(id: string): Observable<UsuarioAdmin> {
    return this.http.get<UsuarioAdmin>(`${this.apiURL}/${id}`, this.obtenerOpciones())
  }

  actualizar(id: string, datos: Partial<Pick<UsuarioAdmin, 'nombres' | 'apellidos' | 'correo' | 'rol' | 'estado'>>): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.apiURL}/${id}`, datos, this.obtenerOpciones())
  }

  eliminar(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiURL}/${id}`, this.obtenerOpciones());
  }
}
