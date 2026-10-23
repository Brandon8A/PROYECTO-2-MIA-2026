import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth';
import { Carpeta } from '../pages/carpetas/model/carpeta.model';
import { RespuestaCarpetas } from '../pages/carpetas/model/respuesta-carpetas.model';
import { RespuestaCarpeta } from '../pages/carpetas/model/respuesta-carpeta.model';

@Injectable({
  providedIn: 'root',
})
export class CarpetasService {
  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)

  private readonly apiUrl = 'http://localhost:3000/api/carpetas'

  private obtenerOpciones() {
    const token = this.auth.obtenerToken()
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}`, }), }
  }

  listar(carpetaPadreId: string | null = null): Observable<Carpeta[]> {
    const opciones = this.obtenerOpciones()
    const params: Record<string, string> = {}
    if (carpetaPadreId !== null) {
      params['carpetaPadreId'] = carpetaPadreId
    }
    return this.http.get<RespuestaCarpetas>(this.apiUrl, { ...opciones, params, })
      .pipe(map(respuesta => respuesta.carpetas))
  }

  crear(nombre: string, carpetaPadreId: string | null = null): Observable<Carpeta> {
    return this.http.post<RespuestaCarpeta>(this.apiUrl, { nombre, carpetaPadreId }, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.carpeta))
  }

  listarPapelera(): Observable<Carpeta[]> {
    return this.http.get<RespuestaCarpetas>(`${this.apiUrl}/papelera`, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.carpetas))
  }

  actualizar(id: string, datos: { nombre?: string; carpetaPadreId?: string | null }): Observable<Carpeta> {
    return this.http.put<RespuestaCarpeta>(`${this.apiUrl}/${id}`, datos, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.carpeta));
  }

  enviarAPapelera(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.obtenerOpciones())
  }

  obtenerPorId(id: string): Observable<Carpeta> {
    return this.http.get<RespuestaCarpeta>(`${this.apiUrl}/${id}`, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.carpeta));
  }

  eliminar(id: string): Observable<unknown> {
    return this.enviarAPapelera(id)
  }

  restaurar(id: string): Observable<{ mensaje: string; carpetasRestauradas: number }> {
    return this.http.patch<{ mensaje: string; carpetasRestauradas: number }>(`${this.apiUrl}/${id}/restaurar`, {}, this.obtenerOpciones())
  }

  eliminarDefinitivamente(id: string): Observable<{
    mensaje: string;
    carpetasEliminadas: number;
    archivosEliminados: number;
  }> {return this.http.delete<{ mensaje: string; carpetasEliminadas: number; archivosEliminados: number; }>(`${this.apiUrl}/${id}/permanente`, this.obtenerOpciones())}

}
