import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { AuthService } from './auth';
import { Archivo } from '../pages/archivos/models/archivo.model';
import { RespuestaArchivos } from '../pages/archivos/models/respuesta-archivos.model';
import { RespuestaArchivo } from '../pages/archivos/models/respuesta-archivo.model';

@Injectable({
  providedIn: 'root',
})
export class ArchivosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'http://localhost:3000/api/archivos';

  private obtenerOpciones() {
    const token = this.auth.obtenerToken();
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}`, }), }
  }

  listar(carpetaId: string | null = null): Observable<Archivo[]> {
    const opciones = this.obtenerOpciones();
    const params: Record<string, string> = {};
    if (carpetaId !== null) {
      params['carpetaId'] = carpetaId;
    }
    return this.http.get<RespuestaArchivos>(this.apiUrl, { ...opciones, params, })
      .pipe(map(respuesta => respuesta.archivos))
  }

  subir(archivo: File, carpetaId: string | null = null): Observable<Archivo> {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    if (carpetaId !== null) {
      formulario.append('carpetaId', carpetaId);
    }

    // No establecer Content-Type manualmente para FormData.
    return this.http.post<RespuestaArchivo>(this.apiUrl, formulario, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.archivo))
  }

  obtenerPorId(id: string): Observable<Archivo> {
    return this.http.get<RespuestaArchivo>(`${this.apiUrl}/${id}`, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.archivo));
  }

  descargar(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, { ...this.obtenerOpciones(), responseType: 'blob', })
  }

  actualizar(id: string, datos: { nombre?: string; carpetaId?: string | null }): Observable<Archivo> {
    return this.http.put<RespuestaArchivo>(`${this.apiUrl}/${id}`, datos, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.archivo));
  }

  enviarAPapelera(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.obtenerOpciones())
  }

  listarPapelera(): Observable<Archivo[]> {
    return this.http.get<RespuestaArchivos>(`${this.apiUrl}/papelera`, this.obtenerOpciones())
      .pipe(map(respuesta => respuesta.archivos))
  }

  restaurar(id: string): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${this.apiUrl}/${id}/restaurar`, {},this.obtenerOpciones())
  }

  eliminarDefinitivamente(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}/permanente`, this.obtenerOpciones())
  }
}
