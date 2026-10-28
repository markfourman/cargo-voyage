/* Cargo Voyage - content: routes, products and the glossary.
   To add a route or a product, add one entry here; the lesson builder does the rest. */
(function (CV) {
  'use strict';

  CV.U = {
    seg(p, a, b) {
      let t = (p - a) / (b - a);
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      return t * t * (3 - 2 * t);
    },
    lp(a, b, t) { return a + (b - a) * t; },
    clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
  };

  const origins = [
    { city: 'São Paulo', country: 'Brazil', seaPort: 'Santos Port', airport: 'São Paulo–Guarulhos', airCode: 'GRU',
      carrier: 'Maersk', ocean: 'Atlantic', seaDays: 21, airHours: 10, flag: 'brazil', boxCol: '#42b0d5' },
    { city: 'Shanghai', country: 'China', seaPort: 'Port of Shanghai', airport: 'Shanghai Pudong', airCode: 'PVG',
      carrier: 'COSCO', ocean: 'Pacific', seaDays: 14, airHours: 11, flag: 'china', boxCol: '#2850a0' },
    { city: 'Frankfurt', country: 'Germany', seaPort: 'Port of Hamburg', airport: 'Frankfurt Airport', airCode: 'FRA',
      carrier: 'Hapag-Lloyd', ocean: 'Atlantic', seaDays: 10, airHours: 8, flag: 'germany', boxCol: '#e66e1e' },
  ];

  const dests = [
    { city: 'Montreal', prov: 'QC', airport: 'Montréal–Trudeau', airCode: 'YUL' },
    { city: 'Hamilton', prov: 'ON', airport: 'Toronto Pearson', airCode: 'YYZ' },
    { city: 'Vancouver', prov: 'BC', airport: 'Vancouver International', airCode: 'YVR' },
  ];

  const items = [
    { name: 'Sugar', short: 'sugar', desc: 'Bagged food staple, everyday general cargo', kg: 24000, col: '#eee2c4',
      dg: false, reefer: false, food: false, bulky: false },
    { name: 'Laptops', short: 'laptops', desc: 'Lithium batteries make them dangerous goods', kg: 9800, col: '#a07c58',
      dg: true, reefer: false, food: false, bulky: false },
    { name: 'Fresh mangoes', short: 'fresh mangoes', desc: 'Perishable food that has to stay cool', kg: 20000, col: '#f0aa28',
      dg: false, reefer: true, food: true, bulky: false },
    { name: 'Furniture', short: 'furniture', desc: 'Bulky but light, so it’s priced by volume', kg: 7900, col: '#a06e46',
      dg: false, reefer: false, food: false, bulky: true },
  ];

  // Atlantic shipments discharge at Montreal, Pacific ones at Vancouver; anything else continues by rail.
  function podCity(o) { return o.ocean === 'Pacific' ? 'Vancouver' : 'Montreal'; }
  function podName(o) { return 'Port of ' + podCity(o); }

  function routeLegs(cfg) {
    const o = origins[cfg.origin], d = dests[cfg.dest];
    if (cfg.air) return [o.city, 'truck', o.airCode, 'flight', d.airCode, 'truck', d.city];
    const legs = [o.city, 'truck', o.seaPort, 'ship', podName(o)];
    if (podCity(o) !== d.city) legs.push('rail');
    legs.push('truck', d.city);
    return legs;
  }

  const T = [
    ['importer', 'Importer', 'The buyer who brings goods into a country.'],
    ['exporter', 'Exporter', 'The seller who sends goods out of a country.'],
    ['ff', 'Freight forwarder (FF)', 'A “travel agent for cargo” that books carriers, trucks and paperwork.'],
    ['gsa', 'GSA (general sales agent)', 'A company that sells an airline’s cargo space in a country.'],
    ['chargeable', 'Chargeable weight', 'Air freight price basis: actual weight or volume weight (L × W × H cm ÷ 6000), whichever is greater.'],
    ['straight', 'Straight truck', 'A truck whose cargo box and cab share one frame, with no separate trailer.'],
    ['trucking', 'Trucking service', 'A company that moves cargo by road between doors, terminals and ports.'],
    ['chassis', 'Chassis', 'The wheeled steel frame that a container rides on behind a truck.'],
    ['container', 'Container', 'A standard steel box for cargo that moves by ship, train and truck.'],
    ['fcl', 'FCL', 'Full container load: one shipper’s cargo gets a whole container.'],
    ['lcl', 'LCL', 'Less than container load: several shippers share one container.'],
    ['cfs', 'CFS', 'Container freight station: the warehouse where LCL cargo is packed and unpacked.'],
    ['consol', 'Consolidation', 'Combining many shippers’ cargo into one container. Deconsolidation unpacks it again.'],
    ['wm', 'W/M', 'LCL pricing: weight or measure (1 cubic metre = 1,000 kg), whichever is greater.'],
    ['pl', 'Packing list (PL)', 'What is inside the shipment: items, quantities and weights.'],
    ['ci', 'Commercial invoice (CI)', 'The seller’s bill showing the value and the terms of sale.'],
    ['coo', 'Certificate of origin (COO)', 'Proves which country the goods come from.'],
    ['dg', 'Dangerous goods (DG)', 'Cargo that can be a hazard in transport, like lithium batteries (Class 9).'],
    ['dgd', 'Dangerous goods declaration', 'The shipper’s signed form describing hazardous cargo.'],
    ['reefer', 'Reefer and cool chain', 'Refrigerated transport that keeps perishable cargo at a set temperature.'],
    ['vgm', 'Gross VGM', 'Verified gross mass of container plus cargo, declared by the shipper under SOLAS.'],
    ['pol', 'Port of loading (POL)', 'Where the container is loaded onto the ship.'],
    ['pod', 'Port of discharge (POD)', 'Where the container comes off the ship.'],
    ['hbl', 'House bill of lading', 'The freight forwarder’s contract and receipt, issued to the exporter.'],
    ['mbl', 'Master bill of lading', 'The shipping line’s contract and receipt, issued to the freight forwarder.'],
    ['hawb', 'House air waybill (HAWB)', 'The freight forwarder’s air waybill, issued to its shipper.'],
    ['mawb', 'Master air waybill (MAWB)', 'The airline’s air waybill to the freight forwarder (prefix 014 is Air Canada).'],
    ['emanifest', 'e-Manifest', 'Advance electronic cargo data sent to the CBSA before the cargo arrives.'],
    ['aci', 'ACI', 'Advance Commercial Information: the CBSA program for advance cargo data.'],
    ['cbsa', 'CBSA', 'Canada Border Services Agency: checks, taxes and releases imports.'],
    ['cb', 'Customs broker (CB)', 'A licensed expert who clears goods through customs for the importer.'],
    ['cci', 'CCI', 'Canada Customs Invoice: a standard invoice form for goods entering Canada.'],
    ['cad', 'CAD', 'Commercial Accounting Declaration: the digital import form that replaced the B3.'],
    ['carm', 'CARM', 'CBSA Assessment and Revenue Management: Canada’s import accounting system.'],
    ['cfia', 'CFIA', 'Canadian Food Inspection Agency: checks imported food, plants and animals.'],
    ['intermodal', 'Intermodal and multimodal', 'Several transport modes, one unopened load. Multimodal means one contract covers it all.'],
    ['imo', 'IMO', 'International Maritime Organization: the UN agency for shipping safety and pollution.'],
    ['solas', 'SOLAS', 'Safety of Life at Sea: the IMO convention that requires the VGM.'],
    ['colreg', 'COLREG', 'IMO rules for preventing collisions at sea.'],
    ['imdg', 'IMDG code', 'IMO rules for carrying dangerous goods by sea.'],
    ['uld', 'ULD', 'Unit load device: an aircraft pallet (PMC) or container (AKE, also called LD3).'],
    ['groundh', 'Ground handler', 'The airport company that screens, builds up and loads air cargo.'],
    ['screening', 'Security screening', 'A check, like an X-ray, that all air cargo must pass before it flies.'],
    ['icao', 'ICAO', 'International Civil Aviation Organization: the UN agency for aviation standards.'],
    ['iata', 'IATA', 'The airlines’ trade association, which sets air waybill and dangerous goods rules.'],
    ['navcan', 'NAV CANADA', 'Runs air traffic control in Canadian airspace.'],
    ['tc', 'Transport Canada', 'The federal department that oversees air cargo security.'],
    ['sufferance', 'Sufferance warehouse', 'A CBSA-licensed warehouse that holds cargo until it is released.'],
  ];
  const terms = {};
  for (const t of T) terms[t[0]] = [t[1], t[2]];

  CV.Content = { origins, dests, items, terms, podCity, podName, routeLegs };
})(globalThis.CV = globalThis.CV || {});
