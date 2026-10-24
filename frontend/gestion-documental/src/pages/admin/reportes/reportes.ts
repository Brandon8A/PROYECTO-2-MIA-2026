import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReportesService } from '../../../services/reportes-service';
import { ReporteArchivos } from '../models/reporte-archivos.model';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesAdmin implements OnInit {
  private readonly reportesService = inject(ReportesService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly Object = Object;

  reporte: ReporteArchivos | null = null;

  fechaInicio = '';
  fechaFin = '';

  cargando = false;
  error = '';

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.error = '';

    if (
      this.fechaInicio &&
      this.fechaFin &&
      this.fechaInicio > this.fechaFin
    ) {
      this.error =
        'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }

    this.cargando = true;

    this.reportesService
      .obtenerReporte(this.fechaInicio, this.fechaFin)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (respuesta) => {
          this.reporte = respuesta;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar los reportes:', err);

          this.error =
            err.error?.mensaje ??
            'No fue posible cargar los reportes. Verifica tu sesión y el servidor.';
          this.cdr.detectChanges();
        }
      });
  }

  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cargarReporte();
  }

  formatearBytes(bytes: number | null | undefined): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }

    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    const indice = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      unidades.length - 1
    );

    const valor = bytes / Math.pow(1024, indice);

    return `${valor.toLocaleString('es-GT', {
      maximumFractionDigits: 2
    })} ${unidades[indice]}`;
  }

  obtenerPorcentaje(valor: number, total: number): number {
    if (total <= 0 || valor <= 0) {
      return 0;
    }

    return Math.min((valor / total) * 100, 100);
  }

  nombreEstado(estado: string): string {
    const nombres: Record<string, string> = {
      activo: 'Activos',
      papelera: 'En papelera',
      eliminado: 'Eliminados'
    };

    return nombres[estado] ?? estado;
  }

  nombreUsuario(usuario: {
    nombres?: string;
    apellidos?: string;
    correo?: string;
  }): string {
    const nombre = `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''
      }`.trim();

    return nombre || usuario.correo || 'Usuario no disponible';
  }
}
