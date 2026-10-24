import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth';
import { RespuestaComparticion } from '../pages/comparticion/models/respuesta-comparticion.model';
import { SolicitudComparticion } from '../pages/comparticion/models/solicitud-comparticion.model';
import { RespuestaComparticionesRecibidas } from '../pages/comparticion/models/respuesta-comparticiones-recibidas.model';


export type TipoRecursoCompartido = 'archivo' | 'carpeta';
export type TipoPermisoCompartido = 'lectura' | 'edicion';

@Injectable({
  providedIn: 'root'
})
export class ComparticionesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'http://localhost:3000/api/comparticiones';

  private obtenerOpciones() {
    const token = this.auth.obtenerToken()
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` }) }
  }

  compartir(solicitud: SolicitudComparticion): Observable<RespuestaComparticion> {
    return this.http.post<RespuestaComparticion>(this.apiUrl, solicitud, this.obtenerOpciones())
  }

  listarRecibidas(): Observable<RespuestaComparticionesRecibidas> {
    return this.http.get<RespuestaComparticionesRecibidas>(`${this.apiUrl}/recibidas`, this.obtenerOpciones())
  }

}
