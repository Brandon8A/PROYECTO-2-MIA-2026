import { TestBed } from '@angular/core/testing';

import { ComparticionesService } from './comparticiones-service';

describe('ComparticionesService', () => {
  let service: ComparticionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComparticionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
