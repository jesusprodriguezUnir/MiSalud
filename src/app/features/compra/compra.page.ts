import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { PlanService } from '../../core/plan.service';
import { ExportService } from '../../core/export.service';
import { agregarCompra } from '../../domain/compra.calc';
import { num } from '../../domain/fecha.util';

const DIAS = [
  { corto: 'L', largo: 'Lunes' },
  { corto: 'M', largo: 'Martes' },
  { corto: 'X', largo: 'Miércoles' },
  { corto: 'J', largo: 'Jueves' },
  { corto: 'V', largo: 'Viernes' },
  { corto: 'S', largo: 'Sábado' },
  { corto: 'D', largo: 'Domingo' },
];

const TODOS = [0, 1, 2, 3, 4, 5, 6];

// La selección de días y lo ya metido en el carro se guardan en localStorage y
// no en Firestore: son estado de una compra concreta, no datos del plan, y
// persistirlos en el servidor exigiría un documento nuevo (el modelo de datos no
// se toca sin migración). Así sobreviven a cambiar de pestaña y a recargar, que
// es lo que se perdía antes.
const CLAVE_DIAS = 'misalud.compra.dias';
const CLAVE_CARRO = 'misalud.compra.carro';

function leer(clave: string): number[] | string[] | null {
  try {
    const bruto = localStorage.getItem(clave);
    return bruto ? (JSON.parse(bruto) as number[] | string[]) : null;
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Modo privado o cuota llena: la lista sigue funcionando en memoria.
  }
}

@Component({
  selector: 'app-compra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compra.page.html',
})
export class CompraPage {
  private readonly planSvc = inject(PlanService);
  private readonly exportSvc = inject(ExportService);

  readonly num = num;
  readonly dias = DIAS;

  private readonly seleccion = signal(new Set<number>((leer(CLAVE_DIAS) as number[]) ?? TODOS));
  /** Artículos ya metidos en el carro, por nombre. */
  private readonly carro = signal(new Set<string>((leer(CLAVE_CARRO) as string[]) ?? []));

  readonly grupos = computed(() => agregarCompra(this.planSvc.plan().dieta, this.seleccion()));
  readonly hayItems = computed(() => this.grupos().length > 0);
  readonly todos = computed(() => this.seleccion().size === 7);

  readonly totalItems = computed(() => this.grupos().reduce((n, g) => n + g.items.length, 0));
  readonly enCarro = computed(() => {
    const c = this.carro();
    return this.grupos().reduce((n, g) => n + g.items.filter((v) => c.has(v.n)).length, 0);
  });

  constructor() {
    effect(() => guardar(CLAVE_DIAS, [...this.seleccion()]));
    effect(() => guardar(CLAVE_CARRO, [...this.carro()]));
  }

  activo(i: number): boolean {
    return this.seleccion().has(i);
  }

  toggleDia(i: number): void {
    const s = new Set(this.seleccion());
    if (s.has(i)) s.delete(i);
    else s.add(i);
    this.seleccion.set(s);
  }

  toggleTodos(): void {
    this.seleccion.set(new Set(this.todos() ? [] : TODOS));
  }

  comprado(nombre: string): boolean {
    return this.carro().has(nombre);
  }

  toggleComprado(nombre: string): void {
    const c = new Set(this.carro());
    if (c.has(nombre)) c.delete(nombre);
    else c.add(nombre);
    this.carro.set(c);
  }

  vaciarCarro(): void {
    this.carro.set(new Set());
  }

  exportarPdf(): void {
    this.exportSvc.exportarPdf();
  }
}
