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
import { NOMBRE_INGESTA, ORDEN_INGESTAS } from '../../domain/plan.types';
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
import { EditAcciones } from './edit-acciones';

type Pestana = 'dieta' | 'entreno' | 'habitos' | 'objetivos';

const PESTANAS: readonly { key: Pestana; etiqueta: string }[] = [
  { key: 'dieta', etiqueta: 'Dieta' },
  { key: 'entreno', etiqueta: 'Entreno' },
  { key: 'habitos', etiqueta: 'Hábitos' },
  { key: 'objetivos', etiqueta: 'Objetivos' },
];

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
  imports: [FormsModule, EditAcciones],
  templateUrl: './plan.page.html',
  styleUrl: './plan.page.scss',
})
export class PlanPage {
  private readonly planSvc = inject(PlanService);
  private readonly avisos = inject(AvisoService);

  readonly nombreDia = NOMBRE_DIA;
  readonly nombreIngesta = NOMBRE_INGESTA;
  readonly ordenIngestas = ORDEN_INGESTAS;
  readonly pestanas = PESTANAS;
  readonly tipos: readonly TipoEntreno[] = ['fuerza', 'movilidad', 'cardio'];

  readonly pestana = signal<Pestana>('dieta');
  readonly diaSel = signal(idxDia(new Date()));
  readonly guardando = this.planSvc.guardando;
  readonly error = signal('');

  readonly borrador = signal<Plan>(completar(clonar(this.planSvc.plan())));

  /**
   * Hay cambios sin guardar. Es un flag, no una comparación: antes se hacían dos
   * `limpiar()` y dos `JSON.stringify()` del plan completo (~750 líneas de seed)
   * en cada pulsación de tecla, y en móvil se notaba. Todas las mutaciones pasan
   * por `mutar()`, así que basta con marcarlo ahí.
   */
  readonly sucio = signal(false);

  constructor() {
    effect(() => {
      const remoto = this.planSvc.plan();
      // `sucio` se lee sin rastrear: este effect solo debe dispararse cuando
      // cambia el plan remoto, no cada vez que se teclea en el borrador.
      if (!untracked(this.sucio)) {
        untracked(() => this.resetBorrador(remoto));
      }
    });
  }

  /** Única puerta de entrada a `borrador`: aplica el cambio y marca el borrador
   * como sucio. Ningún `set*` debe tocar el signal directamente. */
  private mutar(fn: (p: Plan) => Plan): void {
    this.borrador.update(fn);
    this.sucio.set(true);
  }

  /** Deja el borrador en sincronía con `plan` y lo marca como limpio. */
  private resetBorrador(plan: Plan): void {
    this.borrador.set(completar(clonar(plan)));
    this.sucio.set(false);
  }

  // ------------------------------------------------------------------ dieta —

  readonly dia = computed<DiaDieta>(() => this.borrador().dieta[this.diaSel()]);

  readonly ingestas = computed(() =>
    ORDEN_INGESTAS.map((key) => ({ key, ingesta: this.dia().ingestas[key] })),
  );

  /** True si el día no tiene ninguna comida con al menos un alimento con nombre:
   * lo señala la pastilla del día para no dejar huecos sin querer. */
  diaIncompleto(i: number): boolean {
    const dia = this.borrador().dieta[i];
    if (!dia) return true;
    return !ORDEN_INGESTAS.some((k) => dia.ingestas[k]?.items.some((it) => it.n.trim().length > 0));
  }

  private setDia(patch: Partial<DiaDieta>): void {
    this.mutar((p) => ({
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

  /**
   * Quita la ingesta del día y ofrece deshacerlo en el toast, en vez de pedir
   * confirmación con el `confirm()` nativo. El borrado solo toca el borrador
   * local —nada se ha escrito aún en Firestore—, así que revertirlo es trivial.
   */
  quitarIngesta(key: IngestaKey): void {
    const dia = this.diaSel();
    const previa = this.dia().ingestas[key];
    this.setIngesta(key, undefined);
    if (previa) {
      this.deshacerBorrado(NOMBRE_INGESTA[key], () => {
        // El usuario puede haber cambiado de día antes de pulsar "Deshacer".
        this.diaSel.set(dia);
        this.setIngesta(key, previa);
      });
    }
  }

  /** Toast "X borrado · Deshacer" común a todos los borrados del editor. */
  private deshacerBorrado(que: string, restaurar: () => void): void {
    this.avisos.deshacer(`${que} borrado. Recuerda guardar el plan.`, restaurar);
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

  borrarItem(key: IngestaKey, i: number, nombre = ''): void {
    const ing = this.dia().ingestas[key];
    if (!ing) return;
    const dia = this.diaSel();
    const previos = ing.items;
    this.setItems(key, quitar(previos, i));
    this.deshacerBorrado(nombre.trim() || `Alimento ${i + 1}`, () => {
      this.diaSel.set(dia);
      this.setItems(key, previos);
    });
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
    this.mutar((p) => ({
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
  borrarBloque(i: number, titulo = ''): void {
    const dia = this.diaSel();
    const previos = this.entreno().bloques;
    this.setBloques(quitar(previos, i));
    this.deshacerBorrado(titulo.trim() || `Bloque ${i + 1}`, () => {
      this.diaSel.set(dia);
      this.setBloques(previos);
    });
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
    this.mutar((p) => ({
      ...p,
      habitos: reemplazar(p.habitos, i, { ...p.habitos[i], ...patch }),
    }));
  }
  anadirHabito(): void {
    this.mutar((p) => ({ ...p, habitos: [...p.habitos, habitoVacio()] }));
  }
  borrarHabito(i: number, titulo = ''): void {
    const previos = this.habitos();
    this.mutar((p) => ({ ...p, habitos: quitar(p.habitos, i) }));
    this.deshacerBorrado(titulo.trim() || `Hábito ${i + 1}`, () =>
      this.mutar((p) => ({ ...p, habitos: previos })),
    );
  }
  moverHabito(i: number, delta: number): void {
    this.mutar((p) => ({ ...p, habitos: mover(p.habitos, i, delta) }));
  }

  setObjetivo(i: number, patch: Partial<Objetivo>): void {
    this.mutar((p) => ({
      ...p,
      objetivos: reemplazar(p.objetivos, i, { ...p.objetivos[i], ...patch }),
    }));
  }
  anadirObjetivo(): void {
    this.mutar((p) => ({ ...p, objetivos: [...p.objetivos, objetivoVacio()] }));
  }
  borrarObjetivo(i: number, titulo = ''): void {
    const previos = this.objetivos();
    this.mutar((p) => ({ ...p, objetivos: quitar(p.objetivos, i) }));
    this.deshacerBorrado(titulo.trim() || `Objetivo ${i + 1}`, () =>
      this.mutar((p) => ({ ...p, objetivos: previos })),
    );
  }
  moverObjetivo(i: number, delta: number): void {
    this.mutar((p) => ({ ...p, objetivos: mover(p.objetivos, i, delta) }));
  }

  // ------------------------------------------------------------------ texto —

  texto(lineas: readonly string[] | undefined): string {
    return aTexto(lineas);
  }

  // --------------------------------------------------------------- guardado —

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.error.set('');
    const plan = limpiar(this.borrador());
    try {
      await this.planSvc.actualizarPlan(plan);
      this.resetBorrador(plan);
      this.avisos.mostrar('Plan guardado.', 'ok');
    } catch (e) {
      console.warn('guardarPlan', e);
      this.error.set('No se ha podido guardar el plan.');
    }
  }

  /** Vuelve al plan remoto. Ofrece deshacer en vez de bloquear con `confirm()`. */
  descartar(): void {
    if (!this.sucio()) return;
    const previo = this.borrador();
    this.resetBorrador(this.planSvc.plan());
    this.error.set('');
    this.avisos.deshacer('Cambios descartados.', () => {
      this.borrador.set(previo);
      this.sucio.set(true);
    });
  }
}
