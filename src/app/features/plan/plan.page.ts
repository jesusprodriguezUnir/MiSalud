import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanService } from '../../core/plan.service';
import { AvisoService } from '../../core/aviso.service';
import { idxDia } from '../../domain/fecha.util';
import { ORDEN_INGESTAS } from '../../domain/plan.types';
import type {
  BloqueEntreno,
  DiaDieta,
  DiaEntreno,
  Habito,
  Ingesta,
  IngestaKey,
  Item,
  Objetivo,
  Plan,
  Receta,
  TipoEntreno,
} from '../../domain/plan.types';
import {
  NOMBRE_DIA,
  aLineas,
  aTexto,
  clonar,
  completar,
  conReceta,
  habitoVacio,
  ingestaVacia,
  itemVacio,
  limpiar,
  mover,
  objetivoVacio,
  quitar,
  reemplazar,
} from '../../domain/plan.edit';

const NOMBRE_INGESTA: Record<IngestaKey, string> = {
  desayuno: 'Desayuno',
  tentempie: 'Tentempié',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

type Pestana = 'dieta' | 'entreno' | 'habitos' | 'objetivos';

// Editor del plan (dieta con recetas, entrenamiento, hábitos y objetivos).
//
// Trabaja siempre sobre un borrador local y solo escribe en Firestore al pulsar
// "Guardar": el plan es un único documento y guardar en cada pulsación
// significaría una escritura por letra tecleada. El borrador se resincroniza
// solo con el plan remoto mientras no haya cambios sin guardar, de modo que una
// edición hecha en otro dispositivo aparece aquí sin recargar, pero nunca pisa
// lo que se está escribiendo.
@Component({
  selector: 'app-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './plan.page.html',
  styleUrl: './plan.page.scss',
})
export class PlanPage {
  private readonly planSvc = inject(PlanService);
  private readonly avisos = inject(AvisoService);

  readonly nombreDia = NOMBRE_DIA;
  readonly nombreIngesta = NOMBRE_INGESTA;
  readonly ordenIngestas = ORDEN_INGESTAS;
  readonly tipos: readonly TipoEntreno[] = ['fuerza', 'movilidad', 'cardio'];

  readonly pestana = signal<Pestana>('dieta');
  readonly diaSel = signal(idxDia(new Date()));
  readonly guardando = this.planSvc.guardando;
  readonly error = signal('');

  readonly borrador = signal<Plan>(completar(clonar(this.planSvc.plan())));

  /** Hay cambios sin guardar. Se compara el plan ya limpio para que retocar un
   * espacio en blanco no cuente como edición. */
  readonly sucio = computed(
    () =>
      JSON.stringify(this.sinMarca(limpiar(this.borrador()))) !==
      JSON.stringify(this.sinMarca(limpiar(completar(this.planSvc.plan())))),
  );

  constructor() {
    effect(() => {
      const remoto = this.planSvc.plan();
      // `sucio` se lee sin rastrear: este effect solo debe dispararse cuando
      // cambia el plan remoto, no cada vez que se teclea en el borrador.
      if (!untracked(this.sucio)) {
        untracked(() => this.borrador.set(completar(clonar(remoto))));
      }
    });
  }

  /** El plan sin `actualizado`: lo pone el servicio en cada escritura y
   * compararlo haría que el borrador saliera sucio nada más guardar. */
  private sinMarca(p: Plan): Omit<Plan, 'actualizado'> {
    return {
      version: p.version,
      dieta: p.dieta,
      entreno: p.entreno,
      habitos: p.habitos,
      objetivos: p.objetivos,
    };
  }

  // ------------------------------------------------------------------ dieta —

  readonly dia = computed<DiaDieta>(() => this.borrador().dieta[this.diaSel()]);

  readonly ingestas = computed(() =>
    ORDEN_INGESTAS.map((key) => ({ key, ingesta: this.dia().ingestas[key] })),
  );

  private setDia(patch: Partial<DiaDieta>): void {
    this.borrador.update((p) => ({
      ...p,
      dieta: reemplazar(p.dieta, this.diaSel(), { ...p.dieta[this.diaSel()], ...patch }),
    }));
  }

  setFotoDia(url: string): void {
    this.setDia({ fotoUrl: url });
  }

  toggleEntrenoFuerte(): void {
    this.setDia({ entrenoFuerte: !this.dia().entrenoFuerte });
  }

  private setIngesta(key: IngestaKey, ingesta: Ingesta | undefined): void {
    const ingestas = { ...this.dia().ingestas };
    if (ingesta) ingestas[key] = ingesta;
    else delete ingestas[key];
    this.setDia({ ingestas });
  }

  anadirIngesta(key: IngestaKey): void {
    this.setIngesta(key, ingestaVacia(key));
  }

  quitarIngesta(key: IngestaKey): void {
    if (!confirm(`¿Quitar ${NOMBRE_INGESTA[key].toLowerCase()} de este día?`)) return;
    this.setIngesta(key, undefined);
  }

  setHora(key: IngestaKey, hora: string): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setIngesta(key, { ...ing, hora });
  }

  // — ítems de una ingesta —

  private setItems(key: IngestaKey, items: Item[]): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setIngesta(key, { ...ing, items });
  }

  setItem(key: IngestaKey, i: number, patch: Partial<Item>): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setItems(key, reemplazar(ing.items, i, { ...ing.items[i], ...patch } as Item));
  }

  anadirItem(key: IngestaKey): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setItems(key, [...ing.items, itemVacio()]);
  }

  borrarItem(key: IngestaKey, i: number): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setItems(key, quitar(ing.items, i));
  }

  moverItem(key: IngestaKey, i: number, delta: number): void {
    const ing = this.dia().ingestas[key];
    if (ing) this.setItems(key, mover(ing.items, i, delta));
  }

  // — receta de un ítem —

  toggleReceta(key: IngestaKey, i: number): void {
    const ing = this.dia().ingestas[key];
    if (!ing) return;
    const item = ing.items[i];
    this.setItems(key, reemplazar(ing.items, i, conReceta(item, !item.receta)));
  }

  private setReceta(key: IngestaKey, i: number, patch: Partial<Receta>): void {
    const ing = this.dia().ingestas[key];
    const receta = ing?.items[i].receta;
    if (!ing || !receta) return;
    this.setItems(
      key,
      reemplazar(ing.items, i, { ...ing.items[i], receta: { ...receta, ...patch } } as Item),
    );
  }

  setIngredientes(key: IngestaKey, i: number, texto: string): void {
    this.setReceta(key, i, { ing: aLineas(texto) });
  }
  setPasos(key: IngestaKey, i: number, texto: string): void {
    this.setReceta(key, i, { pasos: aLineas(texto) });
  }
  setNotaReceta(key: IngestaKey, i: number, nota: string): void {
    this.setReceta(key, i, { nota });
  }
  setFotoReceta(key: IngestaKey, i: number, fotoUrl: string): void {
    this.setReceta(key, i, { fotoUrl });
  }

  // ---------------------------------------------------------------- entreno —

  readonly entreno = computed<DiaEntreno>(() => this.borrador().entreno[this.diaSel()]);

  setEntreno(patch: Partial<DiaEntreno>): void {
    this.borrador.update((p) => ({
      ...p,
      entreno: reemplazar(p.entreno, this.diaSel(), { ...p.entreno[this.diaSel()], ...patch }),
    }));
  }

  private setBloques(bloques: BloqueEntreno[]): void {
    this.setEntreno({ bloques });
  }

  anadirBloque(): void {
    this.setBloques([...this.entreno().bloques, { t: '', e: [] }]);
  }
  borrarBloque(i: number): void {
    this.setBloques(quitar(this.entreno().bloques, i));
  }
  moverBloque(i: number, delta: number): void {
    this.setBloques(mover(this.entreno().bloques, i, delta));
  }
  setTituloBloque(i: number, t: string): void {
    this.setBloques(reemplazar(this.entreno().bloques, i, { ...this.entreno().bloques[i], t }));
  }
  setEjercicios(i: number, texto: string): void {
    this.setBloques(
      reemplazar(this.entreno().bloques, i, { ...this.entreno().bloques[i], e: aLineas(texto) }),
    );
  }
  setClaves(texto: string): void {
    this.setEntreno({ claves: aLineas(texto) });
  }

  // ----------------------------------------------------- hábitos y objetivos —

  readonly habitos = computed(() => this.borrador().habitos);
  readonly objetivos = computed(() => this.borrador().objetivos);

  setHabito(i: number, patch: Partial<Habito>): void {
    this.borrador.update((p) => ({
      ...p,
      habitos: reemplazar(p.habitos, i, { ...p.habitos[i], ...patch }),
    }));
  }
  anadirHabito(): void {
    this.borrador.update((p) => ({ ...p, habitos: [...p.habitos, habitoVacio()] }));
  }
  borrarHabito(i: number): void {
    this.borrador.update((p) => ({ ...p, habitos: quitar(p.habitos, i) }));
  }
  moverHabito(i: number, delta: number): void {
    this.borrador.update((p) => ({ ...p, habitos: mover(p.habitos, i, delta) }));
  }

  setObjetivo(i: number, patch: Partial<Objetivo>): void {
    this.borrador.update((p) => ({
      ...p,
      objetivos: reemplazar(p.objetivos, i, { ...p.objetivos[i], ...patch }),
    }));
  }
  anadirObjetivo(): void {
    this.borrador.update((p) => ({ ...p, objetivos: [...p.objetivos, objetivoVacio()] }));
  }
  borrarObjetivo(i: number): void {
    this.borrador.update((p) => ({ ...p, objetivos: quitar(p.objetivos, i) }));
  }
  moverObjetivo(i: number, delta: number): void {
    this.borrador.update((p) => ({ ...p, objetivos: mover(p.objetivos, i, delta) }));
  }

  // ------------------------------------------------------------------ texto —

  texto(lineas: readonly string[] | undefined): string {
    return aTexto(lineas);
  }

  // --------------------------------------------------------------- guardado —

  async guardar(): Promise<void> {
    this.error.set('');
    const plan = limpiar(this.borrador());
    try {
      await this.planSvc.actualizarPlan(plan);
      this.borrador.set(completar(clonar(plan)));
      this.avisos.mostrar('Plan guardado.', 'ok');
    } catch (e) {
      console.warn('guardarPlan', e);
      this.error.set('No se ha podido guardar el plan.');
    }
  }

  descartar(): void {
    if (this.sucio() && !confirm('¿Descartar los cambios sin guardar?')) return;
    this.borrador.set(completar(clonar(this.planSvc.plan())));
    this.error.set('');
  }
}
