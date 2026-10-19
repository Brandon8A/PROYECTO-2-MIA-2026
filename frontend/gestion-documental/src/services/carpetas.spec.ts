import { TestBed } from '@angular/core/testing';

import { Carpetas } from './carpetas';

describe('Carpetas', () => {
  let service: Carpetas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Carpetas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
