import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { UsuariosService } from '../../services/usuarios';
import { UsuarioAdmin } from './model/usuario-admin.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admins-usuarios',
  imports: [DatePipe],
  templateUrl: './admins-usuarios.html',
  styleUrl: './admins-usuarios.css',
})
export class AdminsUsuarios implements OnInit{

  private readonly usuarioService = inject(UsuariosService)

  usuarios: UsuarioAdmin[] = []
  cargando = false
  mensajeError = ''

  ngOnInit(): void {
    this.cargarUsuarios()
  }

  cargarUsuarios(): void{
    this.cargando = true
    this.mensajeError = ''

    this.usuarioService.listar().subscribe({
      next: (respuesta) => {
        this.usuarios = respuesta
        this.cargando = false
      }, error: (error: HttpErrorResponse) => {
        this.mensajeError = error.error?.mensaje ?? 'No fue posible cargar los usuarios'
        this.cargando = false
      }
    })
  }

}
