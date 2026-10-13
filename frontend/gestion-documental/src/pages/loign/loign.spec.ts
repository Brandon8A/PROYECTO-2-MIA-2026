import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Loign } from './loign';

describe('Loign', () => {
  let component: Loign;
  let fixture: ComponentFixture<Loign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loign],
    }).compileComponents();

    fixture = TestBed.createComponent(Loign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
