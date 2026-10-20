export const trips = [
  {id:'ET 240',time:'08:30',arrival:'12:45',from:'Buenos Aires',to:'Rosario',unit:'Interno 104',service:'Cama ejecutivo',sold:28,capacity:40,price:32500,gate:'06',status:'Embarcando'},
  {id:'ET 242',time:'09:15',arrival:'17:40',from:'Buenos Aires',to:'Córdoba',unit:'Interno 108',service:'Semi cama',sold:34,capacity:48,price:48600,gate:'03',status:'Programado'},
  {id:'ET 246',time:'10:00',arrival:'15:20',from:'Buenos Aires',to:'Mar del Plata',unit:'Interno 112',service:'Cama ejecutivo',sold:19,capacity:40,price:38900,gate:'08',status:'Programado'},
  {id:'ET 250',time:'11:30',arrival:'15:45',from:'Buenos Aires',to:'Rosario',unit:'Interno 106',service:'Semi cama',sold:23,capacity:48,price:29800,gate:'04',status:'Programado'},
  {id:'ET 254',time:'13:00',arrival:'21:25',from:'Buenos Aires',to:'Córdoba',unit:'Interno 110',service:'Cama ejecutivo',sold:36,capacity:40,price:54200,gate:'02',status:'Programado'},
  {id:'ET 258',time:'14:45',arrival:'20:05',from:'Buenos Aires',to:'Mar del Plata',unit:'Interno 114',service:'Semi cama',sold:16,capacity:48,price:34700,gate:'07',status:'Programado'}
];
export const passengers = [{name:'Lucía Fernández',seat:3,ref:'EV-8024'},{name:'Martín Quiroga',seat:4,ref:'EV-8025'},{name:'Camila Sosa',seat:7,ref:'EV-8026'},{name:'Andrés Molina',seat:8,ref:'EV-8027'}];
export const money = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);
export const occupied = (trip,seat) => seat <= trip.sold;
export const filterTrips = (list,query) => list.filter(t => `${t.to} ${t.from} ${t.id}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
