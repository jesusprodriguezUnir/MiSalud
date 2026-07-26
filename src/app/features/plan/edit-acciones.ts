import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

// Clúster subir / bajar / borrar del editor de Plan. Estaba copiado cuatro veces
// en la plantilla (ítems, bloques, hábitos y objetivos), unas 100 líneas, y con
// aria-labels genéricos: doce botones "Subir", "Bajar" y "Borrar" idénticos que
// un lector de pantalla no puede distinguir. Aquí se generan contextuales
// ("Subir alimento 2 de Desayuno") a partir de qué es la fila y dónde está.
@Component({
  selector: 'app-edit-acciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="edit-acciones">
      <button
        class="del"
        type="button"
        (click)="subir.emit()"
        [disabled]="primero()"
        [attr.aria-label]="'Subir ' + descripcion()"
      >
        ↑
      </button>
      <button
        class="del"
        type="button"
        (click)="bajar.emit()"
        [disabled]="ultimo()"
        [attr.aria-label]="'Bajar ' + descripcion()"
      >
        ↓
      </button>
      <button
        class="del"
        type="button"
        (click)="borrar.emit()"
        [attr.aria-label]="'Borrar ' + descripcion()"
      >
        ✕
      </button>
    </div>
  `,
  styles: [
    `
      .edit-acciones {
        display: flex;
        gap: 2px;
      }
      /* .del es global (styles.scss), pero el estado deshabilitado de estos
         botones concretos sí se define aquí, dentro de la encapsulación. */
      .edit-acciones .del:disabled {
        opacity: 0.3;
      }
    `,
  ],
})
export class EditAcciones {
  /** Qué es la fila: "alimento", "bloque", "hábito", "objetivo". */
  readonly tipo = input.required<string>();
  /** Posición 1-based que se muestra en la cabecera de la fila. */
  readonly posicion = input.required<number>();
  /** Contexto opcional: la ingesta a la que pertenece el alimento, por ejemplo. */
  readonly contexto = input<string | undefined>(undefined);

  readonly primero = input(false);
  readonly ultimo = input(false);

  readonly subir = output<void>();
  readonly bajar = output<void>();
  readonly borrar = output<void>();

  readonly descripcion = computed(() => {
    const ctx = this.contexto();
    return `${this.tipo()} ${this.posicion()}${ctx ? ` de ${ctx}` : ''}`;
  });
}
