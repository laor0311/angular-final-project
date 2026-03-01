import { ComponentFixture, TestBed } from '@angular/core/testing';

import { POSDashboard } from './posdashboard';

describe('POSDashboard', () => {
  let component: POSDashboard;
  let fixture: ComponentFixture<POSDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [POSDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(POSDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
