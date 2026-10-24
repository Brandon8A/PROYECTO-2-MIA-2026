import {ChangeDetectorRef, Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';

import {HistorialActividadService } from '../../../services/historial-actividad-service';
import { RegistroActividad } from '../models/registro-actividad.model';

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './actividad.html',
  styleUrl: './actividad.css'
})
export class ActividadAdmin implements OnInit {
  private readonly servicio = inject(HistorialActividadService);
  private readonly cdr = inject(ChangeDetectorRef);

  actividades: RegistroActividad[] = [];
  total = 0;
  cargando = false;
  error = '';

  fechaInicio = '';
  fechaFin = '';
  usuarioId = '';
  tipoOperacion = '';
  recursoTipo = '';

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
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

    this.servicio.obtenerHistorial({
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      usuarioId: this.usuarioId.trim(),
      tipoOperacion: this.tipoOperacion,
      recursoTipo: this.recursoTipo
    })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (respuesta) => {
          this.actividades = respuesta.actividades;
          this.total = respuesta.total;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar el historial:', err);
          this.error =
            err.error?.mensaje ??
            'No fue posible consultar el historial de actividad.';
          this.cdr.detectChanges();
        }
      });
  }

  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.usuarioId = '';
    this.tipoOperacion = '';
    this.recursoTipo = '';
    this.cargarHistorial();
  }

  nombreUsuario(actividad: RegistroActividad): string {
    const usuario = actividad.usuario;

    if (!usuario) {
      return 'Usuario no disponible';
    }

    const nombre =
      `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.trim();

    return nombre || usuario.correo || 'Usuario sin nombre';
  }

  correoUsuario(actividad: RegistroActividad): string {
    return actividad.usuario?.correo ?? 'No disponible';
  }

  nombreOperacion(operacion: string): string {
    const nombres: Record<string, string> = {
      crear: 'Crear',
      consultar: 'Consultar',
      subir: 'Subir archivo',
      descargar: 'Descargar',
      renombrar: 'Cambiar nombre',
      mover: 'Mover',
      eliminar: 'Mover a papelera',
      restaurar: 'Restaurar',
      eliminar_permanente: 'Eliminar permanentemente',
      compartir: 'Compartir',
      modificar_permiso: 'Modificar permiso',
      revocar_comparticion: 'Revocar acceso',
      iniciar_sesion: 'Iniciar sesión',
      cerrar_sesion: 'Cerrar sesión'
    };

    return nombres[operacion] ?? operacion;
  }

  nombreRecurso(tipo: string): string {
    const nombres: Record<string, string> = {
      usuario: 'Usuario',
      carpeta: 'Carpeta',
      archivo: 'Archivo',
      comparticion: 'Recurso compartido',
      sistema: 'Sistema'
    };

    return nombres[tipo] ?? tipo;
  }

  obtenerDetalle(actividad: RegistroActividad): string {
    const detalles = actividad.detalles;

    if (!detalles) {
      return 'Sin detalles adicionales';
    }

    if (typeof detalles === 'string') {
      return detalles;
    }

    const texto = Object.entries(detalles)
      .filter(([, valor]) =>
        valor !== null && valor !== undefined && valor !== ''
      )
      .map(([clave, valor]) => `${clave}: ${String(valor)}`)
      .join(' · ');

    return texto || 'Sin detalles adicionales';
  }

  formatearFecha(fecha: string): string {
    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return 'Fecha no disponible';
    }

    return valor.toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
}
