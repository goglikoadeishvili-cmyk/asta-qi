import type {Answer} from './model';

const plan = 'A-24001 T2';
export const assemblyWalls: Record<string, [string,string,string,string]> = {
  IP1: ['Twin rows of Gypframe 48 S 50 C studs at 600 mm centres, with 99 FC 50 bracing at 1,200 mm centres; stagger bracing by 600 mm above 2,400 mm height','50 mm Isover APR 1200','Two layers of 15 mm Gyproc SoundBloc per face','A-60001 T1'],
  IP2: ['Gypframe 48 S 50 C studs at 600 mm centres','25 mm Isover APR 1200','Two layers of 12.5 mm Gyproc SoundBloc per face','A-60001 T1'],
  IP3: ['Gypframe 60 I 70 I studs at the specified centres','50 mm Isover Steel Frame Infill Batt','Two layers of 12.5 mm Gyproc SoundBloc to the lined face','A-60002 T1'],
  IP4: ['Gypframe 70 S 50 C studs','25 mm Isover APR 1200','One layer of 15 mm Gyproc SoundBloc per face','A-60002 T1'],
  IL1: ['Gypframe GL1 lining channels at 600 mm centres with GL2 brackets','25 mm Isover APR 1200','One layer of 12.5 mm Gyproc SoundBloc','A-60000 T1'],
};
export function assemblyRef(id:string){return 'Assembly Hotel / '+plan+' / A-60000 T1 / '+assemblyWalls[id][3];}
export function assemblyChecks(id:string,stage:string):Answer[]{
  const [frame,infill,board]=assemblyWalls[id];
  const rows:Array<[string,string,string]>=[];
  if(stage==='Metal framing'||stage==='Framing & isolation'){
    rows.push(['stud','Does the installed frame match this requirement? '+frame+'.','The frame matches the specified arrangement: '+frame+'.']);
    if(id!=='IL1'){
      rows.push(['track','Are the head and base tracks and their fixings installed to the '+id+' detail?','The head and base tracks and fixings match the detail.']);
      rows.push(['head-board-strips','Where shown, are the board strips at the head track installed to the applicable deflection head detail?','The board strips at the head track match the type, number and fixing arrangement shown in the deflection head detail.']);
      rows.push(['firestrip','Where shown, is Gyproc FireStrip installed at the head track as detailed?','Gyproc FireStrip is installed at the head track as detailed.']);
    }
  }else if(stage==='Insulation & first fix'){
    rows.push(['infill','Has '+infill+' been installed in the cavity?','The cavity contains '+infill+'.']);
  }else if(stage==='Boarding & sealing'){
    rows.push(['board','Does the inspected board build-up match the following requirement? '+board+'.','The Gyproc SoundBloc thickness and layer count match the specified build-up.']);
    rows.push(['mr','Where required, is the moisture-resistant board on the specified face?','The moisture-resistant board is installed on the specified face.']);
  }else{
    rows.push(['seal','Are the specified junctions sealed to the '+id+' detail?','The inspected junctions are sealed as specified.']);
  }
  return rows.map(([key,question,expected])=>({id:id+'-'+key,section:stage,question,expected:'Yes. '+expected,source:assemblyRef(id),answer:'',result:'Pending',comment:''}));
}
