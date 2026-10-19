import { Component, inject, OnInit } from '@angular/core';
import { CarpetasService } from '../../services/carpetas';
import { Carpeta } from './model/carpeta.model';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-carpetas',
  imports: [FormsModule, DatePipe],
  templateUrl: './carpetas.html',
  styleUrl: './carpetas.css',
})
export class Carpetas implements OnInit {

  private readonly carpetasService = inject(CarpetasService)

  carpetas: Carpeta[] = []
  nombreNuevaCarpeta = ''
  cargando = false
  guardando = false
  mensajeError = ''
  mensajeExito = ''

  ngOnInit(): void {
    this.cargarCarpetas()
  }

  cargarCarpetas(): void {
    this.cargando = true
    this.mensajeError = ''

    this.carpetasService.listar().subscribe({
      next: (respuesta) => {
        this.carpetas = respuesta
        this.cargando = false
      }, error: (error: HttpErrorResponse) => {
        this.mensajeError = error.error?.mensaje ?? 'No fue posible cargar las carpetas'
        this.cargando = false
      }
    })
  }

  crearCarpeta(): void {
    const nombre = this.nombreNuevaCarpeta.trim()

    if (!nombre) {
      this.mensajeError = 'Es necesario escribir un nombre para la carpeta'
      return;
    }

    this.guardando = true
    this.mensajeError = ''
    this.mensajeExito = ''

    this.carpetasService.crear(nombre).subscribe({
      next: (respuesta) => {
        this.nombreNuevaCarpeta = ''
        this.mensajeExito = 'Carpeta creada correctamente'
        this.guardando = false
        this.cargarCarpetas();
      }, error: (error: HttpErrorResponse) => {
        this.mensajeError = error.error?.mensaje ?? 'NO fue posible crear la carpeta'
        this.guardando = false
      }
    })
  }

}
