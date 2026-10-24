import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { RespuestaHistorialActividad } from '../pages/admin/models/respuesta-historial-actividad.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialActividadService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'http://localhost:3000/api/reportes/actividad';

  obtenerHistorial(filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    usuarioId?: string;
    tipoOperacion?: string;
    recursoTipo?: string;
  } = {}): Observable<RespuestaHistorialActividad> {
    const token = this.auth.obtenerToken();

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });

    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }

    return this.http.get<RespuestaHistorialActividad>(
      this.apiUrl,
      { headers, params }
    );
  }
}
