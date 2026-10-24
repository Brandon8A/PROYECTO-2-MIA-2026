import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  private readonly formBuilder = inject(FormBuilder)
  private readonly authService = inject(AuthService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  mostrarPassword = false
  cargando = false
  mensajeError = ''

  formulario = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  })

  enviarFormulario(): void {
    this.mensajeError = '';

    //Condicional para saber si el formulario es valido
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    this.cargando = true;

    this.authService.iniciarSesion(this.formulario.getRawValue()).subscribe({

      next: (respuesta) => {
        this.cargando = false
        console.log('Inicio de sesión correcto', respuesta.usuario.correo)
        console.log('Rol del usuario:', respuesta.usuario.rol)

        // Obtener URL de retorno desde los parámetros de consulta
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')

        // Si existe una URL de retorno válida, conservarla
        const destinoRetorno = returnUrl && returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//')
            ? returnUrl
            : null;

        // Redirigir según el rol del usuario.
        const destino = destinoRetorno ?? (respuesta.usuario.rol === 'admin'
            ? '/admin/usuarios'
            : '/inicio')

        this.router.navigateByUrl(destino);
      },

      error: (error: HttpErrorResponse) => {
        this.cargando = false;

        //Condicionales para mostrar mensajes de los posibles errores que pueden ocurrir al loguearse
        if (error.status === 401) {
          this.mensajeError = 'Credenciales incorrectas'
        } else if (error.status === 403) {
          this.mensajeError = 'La cuenta está inactiva'
        } else if (error.status === 0) {
          this.mensajeError = 'No se puede conectar con el servidor. Verificar backend'
        } else {
          this.mensajeError = error.error?.mensaje || 'Hubo un error al iniciar sesión'
        }
      }
    })

  }

}
