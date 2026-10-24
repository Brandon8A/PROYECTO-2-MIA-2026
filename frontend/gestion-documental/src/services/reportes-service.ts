import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { ReporteArchivos } from '../pages/admin/models/reporte-archivos.model';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'http://localhost:3000/api/reportes';

  private obtenerOpciones() {
    const token = this.auth.obtenerToken();

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token ?? ''}`
      })
    };
  }

  obtenerReporte(fechaInicio: string = '', fechaFin: string = ''): Observable<ReporteArchivos> {
    let params = new HttpParams()
    if (fechaInicio) {
      params = params.set('fechaInicio', fechaInicio)
    }
    if (fechaFin) {
      params = params.set('fechaFin', fechaFin)
    }
    return this.http.get<ReporteArchivos>(`${this.apiUrl}/archivos`, {...this.obtenerOpciones(), params})
  }
}
