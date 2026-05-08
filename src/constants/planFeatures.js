export const PLAN_FEATURES = {
  pessoal: { maxProducts: 0, maxServices: 0, canUsePDV: false, maxAgendaPerMonth: 10, maxTasksPerMonth: 20, maxBirthdays: 2, maxNotesTotal: 5, maxBoletosPerMonth: 5, canUseMeusGastos: false, notesPerDay: 0 },
  pessoal_free: { maxProducts: 0, maxServices: 0, canUsePDV: false, maxAgendaPerMonth: 10, maxTasksPerMonth: 20, maxBirthdays: 2, maxNotesTotal: 5, maxBoletosPerMonth: 5, canUseMeusGastos: false, notesPerDay: 0 },
  pessoal_plus: { maxProducts: 0, maxServices: 0, canUsePDV: false, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 2 },
  pessoal_premium: { maxProducts: 0, maxServices: 0, canUsePDV: false, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 4 },
  pessoal_pro: { maxProducts: 0, maxServices: 0, canUsePDV: false, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 10 },

  pe_free: { maxProducts: 5, maxServices: 5, canUsePDV: true, maxAgendaPerMonth: 10, maxTasksPerMonth: 20, maxBirthdays: 2, maxNotesTotal: 5, maxBoletosPerMonth: 5, canUseMeusGastos: false, notesPerDay: 0 },
  pe_teste_real: { maxProducts: null, maxServices: null, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 10 },
  pe_starter: { maxProducts: 80, maxServices: 80, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 2 },
  pe_pro: { maxProducts: 400, maxServices: 400, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 4 },
  pe_business: { maxProducts: null, maxServices: null, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 10 },

  emp_free: { maxProducts: 5, maxServices: 5, canUsePDV: true, maxAgendaPerMonth: 10, maxTasksPerMonth: 20, maxBirthdays: 2, maxNotesTotal: 5, maxBoletosPerMonth: 5, canUseMeusGastos: false, notesPerDay: 0 },
  emp_small: { maxProducts: 80, maxServices: 80, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 2 },
  emp_medium: { maxProducts: 400, maxServices: 400, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 4 },
  emp_enterprise: { maxProducts: null, maxServices: null, canUsePDV: true, maxAgendaPerMonth: null, maxTasksPerMonth: null, maxBirthdays: null, maxNotesTotal: null, maxBoletosPerMonth: null, canUseMeusGastos: true, notesPerDay: 10 },
};

export function getPlanFeatures(planId) {
  return PLAN_FEATURES[planId] || PLAN_FEATURES.pessoal;
}

export function isFreePlanId(planId) {
  return ['pessoal', 'pessoal_free', 'pe_free', 'emp_free'].includes(planId);
}
