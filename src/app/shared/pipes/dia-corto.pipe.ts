import { Pipe, PipeTransform } from '@angular/core';
import { fmtDiaCorto } from '../../domain/fecha.util';

// Fecha `YYYY-MM-DD` a día corto en español ("mié, 3 jun"). Estaba escrito a
// mano en la tabla de pesos y en la gráfica.
@Pipe({ name: 'diaCorto' })
export class DiaCortoPipe implements PipeTransform {
  transform(fechaIso: string): string {
    return fmtDiaCorto(fechaIso);
  }
}
