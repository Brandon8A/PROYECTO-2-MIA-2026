
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

type TipoElemento = 'carpeta' | 'archivo';
type ExtensionArchivo = 'md' | 'txt';

interface Elemento {
  id: string;
  nombre: string;
  tipo: TipoElemento;
  extension?: ExtensionArchivo;
  carpetaPadreId: string | null;
  fechaModificacion: Date;
  enPapelera?: boolean;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {



  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  busqueda = '';
  menuNuevoAbierto = false;
  menuElementoId: string | null = null;
  carpetaActualId: string | null = null;
  vistaActual: 'mis-carpetas' | 'compartidos' | 'papelera' = 'mis-carpetas';

  // Datos de ejemplo. Después se cargarán desde el usuario autenticado.
  capacidadBytes = 5 * 1024 ** 3;
  utilizadoBytes = 1.2 * 1024 ** 3;

  elementos: Elemento[] = [
    {
      id: 'carpeta-1',
      nombre: 'Documentos personales',
      tipo: 'carpeta',
      carpetaPadreId: null,
      fechaModificacion: new Date()
    },
    {
      id: 'carpeta-2',
      nombre: 'Proyectos',
      tipo: 'carpeta',
      carpetaPadreId: null,
      fechaModificacion: new Date()
    },
    {
      id: 'archivo-1',
      nombre: 'Bienvenido',
      tipo: 'archivo',
      extension: 'md',
      carpetaPadreId: null,
      fechaModificacion: new Date()
    },
    {
      id: 'archivo-2',
      nombre: 'Notas',
      tipo: 'archivo',
      extension: 'txt',
      carpetaPadreId: 'carpeta-1',
      fechaModificacion: new Date()
    }
  ];



  get carpetaActual(): Elemento | undefined {
    return this.elementos.find(
      elemento =>
        elemento.id === this.carpetaActualId &&
        elemento.tipo === 'carpeta' &&
        !elemento.enPapelera
    );
  }

  get rutaCarpetas(): Elemento[] {
    const ruta: Elemento[] = [];
    let id = this.carpetaActualId;

    while (id !== null) {
      const carpeta = this.elementos.find(
        elemento =>
          elemento.id === id &&
          elemento.tipo === 'carpeta' &&
          !elemento.enPapelera
      );

      if (!carpeta) {
        break;
      }

      ruta.unshift(carpeta);
      id = carpeta.carpetaPadreId;
    }

    return ruta;
  }

  get elementosVisibles(): Elemento[] {
    const termino = this.busqueda.trim().toLocaleLowerCase();

    return this.elementos
      .filter(elemento => {
        if (this.vistaActual === 'papelera') {
          return elemento.enPapelera === true;
        }

        if (this.vistaActual === 'compartidos') {
          // Pendiente de conectar con el backend de comparticiones.
          return false;
        }

        return (
          elemento.carpetaPadreId === this.carpetaActualId &&
          !elemento.enPapelera
        );
      })
      .filter(elemento =>
        this.nombreCompleto(elemento)
          .toLocaleLowerCase()
          .includes(termino)
      )
      .sort((a, b) => {
        if (a.tipo !== b.tipo) {
          return a.tipo === 'carpeta' ? -1 : 1;
        }

        return a.nombre.localeCompare(b.nombre);
      });
  }

  get cantidadCarpetas(): number {
    return this.elementosVisibles.filter(
      elemento => elemento.tipo === 'carpeta'
    ).length;
  }

  get cantidadArchivos(): number {
    return this.elementosVisibles.filter(
      elemento => elemento.tipo === 'archivo'
    ).length;
  }

  get disponibleBytes(): number {
    return Math.max(0, this.capacidadBytes - this.utilizadoBytes);
  }

  get porcentajeUtilizado(): number {
    if (this.capacidadBytes <= 0) {
      return 0;
    }

    return Math.min(
      100,
      (this.utilizadoBytes / this.capacidadBytes) * 100
    );
  }

  get espacioUtilizadoTexto(): string {
    return this.formatearBytes(this.utilizadoBytes);
  }

  get espacioDisponibleTexto(): string {
    return this.formatearBytes(this.disponibleBytes);
  }

  get capacidadTexto(): string {
    return this.formatearBytes(this.capacidadBytes);
  }
  /*
    irARaiz(): void {
      this.carpetaActualId = null;
      this.busqueda = '';
      this.menuNuevoAbierto = false;
      this.menuElementoId = null;
    }
      */

  abrirCarpeta(elemento: Elemento): void {
    if (elemento.tipo !== 'carpeta' || elemento.enPapelera) {
      return;
    }

    this.carpetaActualId = elemento.id;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;
  }

  navegarA(carpeta: Elemento | null): void {
    this.carpetaActualId = carpeta?.id ?? null;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;
  }

  alternarMenuNuevo(): void {
    this.menuNuevoAbierto = !this.menuNuevoAbierto;
    this.menuElementoId = null;
  }

  alternarMenuElemento(id: string): void {
    this.menuElementoId = this.menuElementoId === id ? null : id;
    this.menuNuevoAbierto = false;
  }

  crearCarpeta(): void {
    this.menuNuevoAbierto = false;

    const nombre = window.prompt('Nombre de la nueva carpeta:');

    if (nombre === null) {
      return;
    }

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      window.alert('El nombre de la carpeta no puede estar vacío.');
      return;
    }

    if (this.existeElemento(nombreLimpio)) {
      window.alert('Ya existe un elemento con ese nombre en esta ubicación.');
      return;
    }

    this.elementos = [
      ...this.elementos,
      {
        id: this.generarId(),
        nombre: nombreLimpio,
        tipo: 'carpeta',
        carpetaPadreId: this.carpetaActualId,
        fechaModificacion: new Date()
      }
    ];
  }

  crearArchivo(extension: ExtensionArchivo): void {
    this.menuNuevoAbierto = false;

    const nombre = window.prompt(
      `Nombre del archivo .${extension} (sin extensión):`
    );

    if (nombre === null) {
      return;
    }

    const nombreBase = nombre.trim().replace(/\.(md|txt)$/i, '').trim();

    if (!nombreBase) {
      window.alert('Debes ingresar un nombre válido.');
      return;
    }

    const nuevoArchivo: Elemento = {
      id: this.generarId(),
      nombre: nombreBase,
      tipo: 'archivo',
      extension,
      carpetaPadreId: this.carpetaActualId,
      fechaModificacion: new Date()
    };

    if (this.existeElemento(this.nombreCompleto(nuevoArchivo))) {
      window.alert('Ya existe un elemento con ese nombre en esta ubicación.');
      return;
    }

    this.elementos = [...this.elementos, nuevoArchivo];
  }

  cambiarNombre(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const nombreActual = this.nombreCompleto(elemento);
    const nuevoNombre = window.prompt(
      'Ingresa el nuevo nombre:',
      nombreActual
    );

    if (nuevoNombre === null) {
      return;
    }

    let nombreLimpio = nuevoNombre.trim();

    if (!nombreLimpio) {
      window.alert('El nombre no puede estar vacío.');
      return;
    }

    if (elemento.tipo === 'archivo') {
      nombreLimpio = nombreLimpio.replace(/\.(md|txt)$/i, '').trim();

      if (!nombreLimpio) {
        window.alert('Ingresa un nombre válido para el archivo.');
        return;
      }
    }

    const nombreComparacion =
      elemento.tipo === 'archivo'
        ? `${nombreLimpio}.${elemento.extension}`
        : nombreLimpio;

    if (
      this.existeElemento(nombreComparacion, elemento.id)
    ) {
      window.alert('Ya existe un elemento con ese nombre.');
      return;
    }

    this.elementos = this.elementos.map(actual =>
      actual.id === elemento.id
        ? {
          ...actual,
          nombre: nombreLimpio,
          fechaModificacion: new Date()
        }
        : actual
    );
  }

  descargarElemento(elemento: Elemento): void {
    this.cerrarMenuElemento();

    if (elemento.tipo === 'carpeta') {
      const contenido = this.obtenerContenidoCarpeta(elemento.id);
      this.descargarBlob(
        JSON.stringify(contenido, null, 2),
        `${elemento.nombre}.json`,
        'application/json'
      );
      return;
    }

    const nombre = this.nombreCompleto(elemento);

    // Contenido de demostración: todavía no se recupera el contenido real
    // de los archivos desde MongoDB.
    const contenido =
      elemento.extension === 'md'
        ? `# ${elemento.nombre}\n\nDocumento de ejemplo.`
        : `Documento de ejemplo: ${elemento.nombre}`;

    this.descargarBlob(
      contenido,
      nombre,
      elemento.extension === 'md' ? 'text/markdown' : 'text/plain'
    );
  }

  compartirElemento(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const correo = window.prompt(
      `Correo del usuario con quien deseas compartir "${elemento.nombre}":`
    );

    if (correo === null) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      window.alert('Ingresa una dirección de correo válida.');
      return;
    }

    window.alert(
      'La interfaz está preparada, pero el uso compartido real requiere ' +
      'conectar esta acción con el endpoint de comparticiones del backend.'
    );
  }

  moverElemento(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const carpetasDestino = this.elementos.filter(carpeta =>
      carpeta.tipo === 'carpeta' &&
      !carpeta.enPapelera &&
      carpeta.id !== elemento.id &&
      !this.esDescendiente(carpeta.id, elemento.id)
    );

    const instrucciones = [
      'Escribe el ID de la carpeta de destino.',
      'Deja el campo vacío para mover a Mi unidad.',
      '',
      ...carpetasDestino.map(
        carpeta => `${carpeta.nombre} — ID: ${carpeta.id}`
      )
    ].join('\n');

    const idDestinoIngresado = window.prompt(instrucciones, '');

    if (idDestinoIngresado === null) {
      return;
    }

    const idDestino = idDestinoIngresado.trim() || null;

    if (idDestino === elemento.carpetaPadreId) {
      window.alert('El elemento ya se encuentra en esa ubicación.');
      return;
    }

    if (idDestino !== null) {
      const destinoValido = carpetasDestino.some(
        carpeta => carpeta.id === idDestino
      );

      if (!destinoValido) {
        window.alert('La carpeta de destino no es válida.');
        return;
      }
    }

    if (this.existeElementoEnCarpeta(
      this.nombreCompleto(elemento),
      idDestino,
      elemento.id
    )) {
      window.alert('Ya existe un elemento con ese nombre en el destino.');
      return;
    }

    this.elementos = this.elementos.map(actual =>
      actual.id === elemento.id
        ? {
          ...actual,
          carpetaPadreId: idDestino,
          fechaModificacion: new Date()
        }
        : actual
    );
  }

  verInformacion(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const detalles = [
      `Nombre: ${this.nombreCompleto(elemento)}`,
      `Tipo: ${elemento.tipo === 'carpeta' ? 'Carpeta' : 'Documento'}`,
      `ID: ${elemento.id}`,
      `Ubicación: ${elemento.carpetaPadreId
        ? this.obtenerRutaCarpeta(elemento.carpetaPadreId)
        : 'Mi unidad'
      }`,
      `Última modificación: ${elemento.fechaModificacion.toLocaleString()}`
    ].join('\n');

    window.alert(detalles);
  }

  moverAPapelera(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const confirmado = window.confirm(
      `¿Deseas mover "${this.nombreCompleto(elemento)}" a la papelera?`
    );

    if (!confirmado) {
      return;
    }

    const ids = new Set<string>([elemento.id]);

    // Si es una carpeta, incluir todos sus elementos descendientes.
    if (elemento.tipo === 'carpeta') {
      let cambio = true;

      while (cambio) {
        cambio = false;

        for (const actual of this.elementos) {
          if (
            actual.carpetaPadreId &&
            ids.has(actual.carpetaPadreId) &&
            !ids.has(actual.id)
          ) {
            ids.add(actual.id);
            cambio = true;
          }
        }
      }
    }

    this.elementos = this.elementos.map(actual =>
      ids.has(actual.id)
        ? { ...actual, enPapelera: true }
        : actual
    );

    if (ids.has(this.carpetaActualId ?? '')) {
      this.irARaiz();
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  nombreCompleto(elemento: Elemento): string {
    return elemento.tipo === 'archivo'
      ? `${elemento.nombre}.${elemento.extension}`
      : elemento.nombre;
  }

  formatearBytes(bytes: number): string {
    if (bytes <= 0) {
      return '0 B';
    }

    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    const indice = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      unidades.length - 1
    );

    const valor = bytes / 1024 ** indice;

    return `${valor.toLocaleString('es-GT', {
      maximumFractionDigits: 1
    })} ${unidades[indice]}`;
  }

  private existeElemento(
    nombre: string,
    excluirId?: string
  ): boolean {
    return this.existeElementoEnCarpeta(
      nombre,
      this.carpetaActualId,
      excluirId
    );
  }

  private existeElementoEnCarpeta(
    nombre: string,
    carpetaId: string | null,
    excluirId?: string
  ): boolean {
    const nombreNormalizado = nombre.toLocaleLowerCase();

    return this.elementos.some(elemento =>
      elemento.id !== excluirId &&
      !elemento.enPapelera &&
      elemento.carpetaPadreId === carpetaId &&
      this.nombreCompleto(elemento).toLocaleLowerCase() === nombreNormalizado
    );
  }

  private esDescendiente(
    posibleDescendienteId: string,
    ancestroId: string
  ): boolean {
    let idActual: string | null = posibleDescendienteId;

    while (idActual !== null) {
      const actual = this.elementos.find(
        elemento => elemento.id === idActual
      );

      if (!actual) {
        return false;
      }

      if (actual.carpetaPadreId === ancestroId) {
        return true;
      }

      idActual = actual.carpetaPadreId;
    }

    return false;
  }

  private obtenerRutaCarpeta(id: string): string {
    const partes: string[] = [];
    let idActual: string | null = id;

    while (idActual !== null) {
      const carpeta = this.elementos.find(
        elemento => elemento.id === idActual
      );

      if (!carpeta) {
        break;
      }

      partes.unshift(carpeta.nombre);
      idActual = carpeta.carpetaPadreId;
    }

    return `Mi unidad / ${partes.join(' / ')}`;
  }

  private obtenerContenidoCarpeta(id: string): unknown {
    const carpeta = this.elementos.find(elemento => elemento.id === id);

    if (!carpeta) {
      return null;
    }

    return {
      nombre: carpeta.nombre,
      tipo: 'carpeta',
      elementos: this.elementos
        .filter(elemento =>
          elemento.carpetaPadreId === id && !elemento.enPapelera
        )
        .map(elemento =>
          elemento.tipo === 'carpeta'
            ? this.obtenerContenidoCarpeta(elemento.id)
            : {
              nombre: this.nombreCompleto(elemento),
              tipo: 'archivo',
              fechaModificacion: elemento.fechaModificacion
            }
        )
    };
  }

  private descargarBlob(
    contenido: string,
    nombre: string,
    tipo: string
  ): void {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = nombre;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  private cerrarMenuElemento(): void {
    this.menuElementoId = null;
  }

  private generarId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  irACompartidos(): void {
    this.vistaActual = 'compartidos';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuElementoId = null;
    this.menuNuevoAbierto = false;
  }

  irAPapelera(): void {
    this.vistaActual = 'papelera';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuElementoId = null;
    this.menuNuevoAbierto = false;
  }

  irARaiz(): void {
    this.vistaActual = 'mis-carpetas';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;
  }
}
