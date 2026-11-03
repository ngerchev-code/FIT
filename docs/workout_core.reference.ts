/** Platform-agnostic, dependency-free reference logic. Integrate with existing app architecture. */
export type UUID = string;
export type WorkoutState = 'planned'|'active'|'paused'|'completed'|'cancelled';
export type SetState = 'ready'|'active'|'completed'|'cancelled';
export type Source = 'manual'|'wearable'|'imported'|'inferred';
export interface Equipment { id:UUID; name:string; muscleGroups:string[]; }
export interface Exercise { id:UUID; equipmentId:UUID; name:string; defaultRestSec:number; }
export interface WorkoutSet {
  id:UUID; exerciseId:UUID; state:SetState; startedAt?:string; endedAt?:string;
  weightKg?:number; reps?:number; source?:Source; version:number;
}
export interface WorkoutSession {
  id:UUID; state:WorkoutState; activeExerciseId?:UUID; sets:WorkoutSet[]; version:number;
}
export type Action =
 | {type:'START_WORKOUT'} | {type:'PAUSE_WORKOUT'} | {type:'RESUME_WORKOUT'}
 | {type:'END_WORKOUT'} | {type:'SWITCH_EXERCISE'; exerciseId:UUID}
 | {type:'START_SET'; setId:UUID; at:string}
 | {type:'COMPLETE_SET'; setId:UUID; at:string; reps:number; weightKg:number; source:Source};
export function applyAction(s:WorkoutSession, a:Action):WorkoutSession {
  if (a.type==='START_WORKOUT' && s.state==='planned') return {...s,state:'active',version:s.version+1};
  if (a.type==='PAUSE_WORKOUT' && s.state==='active') return {...s,state:'paused',version:s.version+1};
  if (a.type==='RESUME_WORKOUT' && s.state==='paused') return {...s,state:'active',version:s.version+1};
  if (a.type==='END_WORKOUT' && (s.state==='active'||s.state==='paused')) {
    if (s.sets.some(x=>x.state==='active')) throw new Error('Finish or cancel active set first');
    return {...s,state:'completed',version:s.version+1};
  }
  if (a.type==='SWITCH_EXERCISE') {
    if (s.state!=='active'||s.sets.some(x=>x.state==='active')) throw new Error('Cannot switch during active set');
    return {...s,activeExerciseId:a.exerciseId,version:s.version+1};
  }
  if (a.type==='START_SET') {
    if(s.state!=='active'||s.sets.some(x=>x.state==='active')) throw new Error('Session not ready');
    const target=s.sets.find(x=>x.id===a.setId);
    if(!target||target.state!=='ready'||target.exerciseId!==s.activeExerciseId) throw new Error('Invalid set');
    return {...s,sets:s.sets.map(x=>x.id===a.setId?{...x,state:'active',startedAt:a.at,version:x.version+1}:x),version:s.version+1};
  }
  if (a.type==='COMPLETE_SET') {
    const target=s.sets.find(x=>x.id===a.setId);
    if(target?.state==='completed') return s; // idempotent retry
    if(s.state!=='active'||target?.state!=='active'||!Number.isFinite(a.reps)||!Number.isFinite(a.weightKg)||a.reps<0||a.weightKg<0) throw new Error('Invalid completion');
    return {...s,sets:s.sets.map(x=>x.id===a.setId?{...x,state:'completed',endedAt:a.at,reps:a.reps,weightKg:a.weightKg,source:a.source,version:x.version+1}:x),version:s.version+1};
  }
  return s;
}
export type SkipReason='work'|'travel'|'fatigue'|'injury'|'weather'|'motivation'|'private'|'other';
export interface SkipDecision {reason:SkipReason; details?:string; alternative:'rest'|'walk'|'home'|'gym'|'reschedule'; newTime?:string; confirmed:boolean;}
export function validateSkipDecision(d:SkipDecision):string[] {
  const errors:string[]=[];
  if(!d.reason) errors.push('Reason required');
  if(d.alternative==='reschedule'&&!d.newTime) errors.push('Date/time required');
  if(d.reason==='injury'&&d.alternative==='gym') errors.push('Review safety before training');
  return errors;
}
