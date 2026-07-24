import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { PlanService } from '../../core/plan.service';
import { agregarCompra } from '../../domain/compra.calc';
import { num } from '../../domain/fecha.util';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'app-compra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compra.page.html',
})
export class CompraPage {
  private readonly planSvc = inject(PlanService);

  readonly num = num;
  readonly dias = DIAS;

  private readonly seleccion = signal(new Set([0, 1, 2, 3, 4, 5, 6]));

  readonly grupos = computed(() => agregarCompra(this.planSvc.plan().dieta, this.seleccion()));
  readonly hayItems = computed(() => this.grupos().length > 0);
  readonly todos = computed(() => this.seleccion().size === 7);

  activo(i: number): boolean {
    return this.seleccion().has(i);
  }

  toggleDia(i: number): void {
    const s = new Set(this.seleccion());
    s.has(i) ? s.delete(i) : s.add(i);
    this.seleccion.set(s);
  }

  toggleTodos(): void {
    this.seleccion.set(new Set(this.todos() ? [] : [0, 1, 2, 3, 4, 5, 6]));
  }
}
