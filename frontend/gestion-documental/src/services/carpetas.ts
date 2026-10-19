import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth';
import { Carpeta } from '../pages/carpetas/model/carpeta.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CarpetasService {

  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)

  private readonly apiUrl = 'http://localhost:3000/api/carpetas'

  private obtenerOpciones() {
    const token = this.auth.obtenerToken()
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    }
  }


  listar(carpetaPadreId: string | null = null): Observable<Carpeta[]> {
    const opciones = this.obtenerOpciones();

    if (carpetaPadreId !== null) {
      return this.http.get<Carpeta[]>(this.apiUrl, { ...opciones, params: { carpetaPadreId } })
    }
    return this.http.get<Carpeta[]>(this.apiUrl, opciones);
  }


  crear(nombre: string, carpetaPadreId: string | null = null): Observable<Carpeta> {
    return this.http.post<Carpeta>(this.apiUrl, { nombre, carpetaPadreId }, this.obtenerOpciones())
  }

  actualizar(id: string, datos: { nombre?: string; carpetaPadreId?: string | null }): Observable<Carpeta> {
    return this.http.put<Carpeta>(`${this.apiUrl}/${id}`, datos, this.obtenerOpciones())
  }

  enviarAPapelera(id: string): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${id}/papelera`, {}, this.obtenerOpciones())
  }

  obtenerPorId(id: string): Observable<Carpeta> {
    return this.http.get<Carpeta>(`${this.apiUrl}/${id}`, this.obtenerOpciones());
  }

  eliminar(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.obtenerOpciones())
  }

}
