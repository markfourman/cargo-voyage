/* Cargo Voyage - the lessons. Each step: title, who acts, whose turn it is, length in seconds,
   sound cues ("name:seconds"), narration, glossary terms, timed animation actions, camera focus and an optional quiz. */
(function (CV) {
  'use strict';
  const EXP = 1, IMP = 2, BOTH = 3, OTH = 0;
  const C = {
    orange: '#e6a014', blue: '#3c6ec8', green: '#289650', amber: '#dc781e', red: '#c8322d',
    master: '#6495ed', grey: '#aaafb9',
  };

  // =====================================================================
  //  SEA FREIGHT
  // =====================================================================
  function sea(b) {
    const s = b.S;
    const xE = b.P('exp'), xF = b.P('ff1'), xC1 = b.P('cfs1'), xSc = b.P('scale');
    const crA = s.craneA, crB = s.craneB, crT = s.craneT, shipA = s.coastA + 75, shipB = s.coastB - 80;
    const xC2 = b.P('cfs2'), xI = b.P('imp');

    order(b); hireFF(b);

    b.St('Book the ship', 'FF + {carrier}', OTH, 5, 'whoosh:0.5,horn:3.0',
      'The FF books space on a {carrier} vessel from {pol} to {pod}. {carrier} is the carrier: the shipping line that owns the ship and the containers.');
    b.DefTerm('carrier', '{carrier}', 'The shipping line (carrier) that owns the vessel on this route.');
    b.T('carrier');
    b.Doc('BOOK', C.orange, xF, shipA, 0.1, 0.6);
    b.Tag('{carrier} vessel', shipA, 300, 12, 0.6);
    b.Hl('ff1', 0);
    b.FollowDoc(shipA);

    b.St('Full or shared container?', 'Exporter + FF', EXP, 4, 'pop:0.3',
      'Time to choose. FCL (full container load) means a whole container just for your cargo. LCL (less than container load) means your pallets share a container with other shippers’ cargo, packed at the FF’s container freight station (CFS).');
    b.T('fcl', 'lcl', 'cfs');
    b.Decide('How should your {item} travel?', [
      [0, 'FCL: full container', 'One sealed container, just for us',
        'FCL suits bigger loads: one shipper, one container, packed and sealed at the exporter’s door. The exporter declares the VGM.'],
      [1, 'LCL: shared container', 'Share space with other shippers',
        'LCL suits smaller loads: the FF consolidates many shippers’ cargo at its CFS and charges by W/M (weight or measure). The FF declares the VGM.'],
    ]);
    b.Tag('FCL or LCL?', xF, 296, 12, 0.2);
    b.Hl('ff1,cfs1', 0);
    b.Focus((xF + xC1) / 2);

    goodsReady(b); paperwork(b);

    if (!b.lcl) {
      b.St('An empty container arrives', 'Trucking service', OTH, 7, 'truck:0.3,beep:3.4,clunk:4.2,clunk:5.4',
        'The FF books a trucking service. A truck arrives pulling a chassis, the wheeled steel frame, with an empty container. Workers load all 10 pallets from the straight truck into the box.');
      b.T('trucking', 'chassis', 'container');
      b.MoveFrom('truckO', -300, xE + 80, 0.05, 0.5);
      b.Hop(10, xE - 10, 438, xE + 116, 440, 0.55, 0.95, s.cargoCol);
      b.Cargo('stO', 8, 0, 0.55, 0.95);
      b.PropTag('Container', 'truckO', 30, 421, 12, 0, 0.5, 1);
      b.PropTag('Trucking service', 'truckO', 98, 418, 46, 0, 0.5, 1);
      b.PropTag('Chassis', 'truckO', 24, 470, -10, 0, 0.5, 1);
      b.Hl('exp', 0);
      b.Focus(xE + 90);
      b.Q('chassis', 'What is a chassis?',
        ['A customs form', 'The wheeled steel frame a container rides on', 'The ship’s captain'], 1,
        'The chassis is the wheeled frame under the container. A truck pulls it on the road.');
    } else {
      b.St('Consolidation at the CFS', 'Freight forwarder', OTH, 8, 'truck:0.3,clunk:3.8,clunk:5.0,clunk:6.6',
        'The straight truck takes the pallets to the FF’s CFS. The FF consolidates them with other shippers’ cargo into one shared container. LCL is charged by W/M: weight or measure, whichever is greater.');
      b.T('consol', 'wm', 'container');
      b.Move('stO', xC1 - 52, 0.05, 0.4);
      b.Hop(10, xC1 - 15, 438, xC1, 420, 0.45, 0.8, s.cargoCol);
      b.Cargo('stO', 8, 0, 0.45, 0.8);
      b.Hop(5, xC1 + 80, 410, xC1, 420, 0.8, 0.98, C.grey);
      b.Move('stO', -300, 0.85, 1.0);
      b.Tag('Many shippers, one container', xC1, 300, 40, 0.5);
      b.Hl('cfs1', 0);
      b.Focus(xC1);
      b.Q('consol', 'In LCL, who consolidates cargo from many shippers into one container?',
        ['The importer', 'The freight forwarder, at its CFS', 'The CBSA'], 1,
        'The FF consolidates LCL cargo at its container freight station, then deconsolidates it at the destination CFS.');
    }

    if (!b.lcl) {
      b.St('Weigh it: gross VGM', 'Exporter', EXP, 7, 'truck:0.3,stamp:5.7',
        'Before boarding, the container is weighed. Under SOLAS, an IMO safety rule, the shipper must declare the verified gross mass: container plus cargo. This is FCL, so the exporter declares the VGM.');
      b.Move('truckO', xSc - 36, 0.05, 0.4);
      b.Scale(b.I.kg + 2300, 0.45, 0.78);
      b.Stamp('VGM DECLARED', xSc, 295, 0.8);
    } else {
      b.St('Weigh it: gross VGM', 'Freight forwarder', OTH, 8, 'truck:0.3,crane:2.2,stamp:6.7',
        'A trucking service picks up the shared container on a chassis. Under SOLAS the shipper must declare the verified gross mass: container plus cargo. This is LCL, so the FF, who packed the box, declares the VGM.');
      b.T('trucking', 'chassis');
      b.MoveFrom('truckO', -300, xC1 - 36, 0.0, 0.25);
      b.Xfer('cfsO', 'truckO', 'lift', 0.27, 0.42);
      b.Move('truckO', xSc - 36, 0.45, 0.62);
      b.Scale(b.I.kg + 2300, 0.64, 0.82);
      b.Stamp('VGM DECLARED', xSc, 295, 0.84);
    }
    b.T('vgm');
    b.Hl('scale', 0);
    b.Follow('truckO');
    b.Q('vgm', 'This shipment is {load}. Who declares the VGM?', ['The exporter', 'The freight forwarder', 'The CBSA'], b.lcl ? 1 : 0,
      'FCL: the exporter (shipper) declares the VGM. LCL: the FF does, because it packs the shared container.');

    b.St('Drive to {pol}', 'Trucking service', OTH, 5, 'truck:0.3,beep:4.5',
      'The trucking service hauls the container to {pol}. Cargo is loaded onto the ship here, so this is the port of loading (POL).');
    b.DefTerm('gwA', '{pol}', '{country}’s seaport where our container boards the ship (the POL).');
    b.T('gwA', 'pol');
    b.Move('truckO', crA - 146, 0.05, 0.9);
    b.Tag('Port of loading (POL)', crA - 110, 332, 12, 0.5);
    b.Hl('dockA', 0);
    b.Follow('truckO');

    exportCustoms(b, crA - 110);
    eManifest(b, false);

    b.St('Load the ship', '{carrier} + port crane', OTH, 9, 'crane:1.6,clunk:8.1,horn:8.4',
      'A giant port crane lifts the container onto the {carrier} ship.' +
      (b.I.reefer ? ' The reefer is plugged into the ship’s power to keep the mangoes cool.' : ' The ship will carry it across the ocean.'));
    b.Xfer('truckO', 'ship', 'craneA', 0.0, 0.95);
    b.Move('truckO', -300, 0.5, 1.0);
    b.Hl('dockA', 0);
    b.Focus(crA + 30);

    b.St('Bills of lading', '{carrier} + FF', EXP, 8, 'whoosh:0.5,whoosh:4.1,ding:7.4',
      'A bill of lading is the contract and receipt for the cargo. {carrier} issues a master bill of lading to the FF. The FF issues its own house bill of lading to the exporter.' +
      (b.lcl ? ' In LCL, every shipper in the box gets its own house bill.' : ''));
    b.T('mbl', 'hbl');
    b.Doc('MBL', C.master, shipA + 40, xF, 0.05, 0.45);
    b.Doc('HBL', C.amber, xF, xE, 0.5, 0.92);
    b.Tag('Master BOL: {carrier} to FF', xF, 292, 16, 0.45);
    b.Tag('House BOL: FF to exporter', xE, 292, 16, 0.92);
    b.Hl('exp,ff1', 0);
    b.FollowDoc((xE + xF) / 2);
    b.Q('hbl', 'Which bill of lading does the freight forwarder issue to the exporter?',
      ['Master bill of lading', 'House bill of lading', 'Certificate of origin'], 1,
      'Master BOL: the carrier to the FF. House BOL: the FF to the exporter.');

    b.St('Across the {ocean}', '{carrier} ship', OTH, 11, 'horn:0.2',
      'About {days} days at sea. The IMO (International Maritime Organization) sets world rules: SOLAS for safety of life at sea, COLREG for preventing collisions and the IMDG code for dangerous goods.' +
      (b.I.dg ? ' Our lithium batteries are stowed under the IMDG code.' : '') +
      (b.I.reefer ? ' The reefer keeps the mangoes cool all the way.' : ''));
    b.T('imo', 'solas', 'colreg', 'imdg');
    b.Move('ship', shipB, 0.06, 0.94);
    b.Follow('ship');
    b.PropTag('Day {n} at sea', 'ship', 10, 322, 12, b.O.seaDays, 0.06, 0.94);
    b.Q('colreg', 'Which IMO rule set is about preventing ships from colliding?', ['SOLAS', 'COLREG', 'IMDG'], 1,
      'COLREG is the collision regulations. SOLAS is safety of life at sea. IMDG covers dangerous goods.');

    b.St('Arrive at {pod}', '{carrier} + port crane', OTH, 10, 'horn:0.1,crane:2.0,clunk:9.2',
      'Land ahoy. The ship docks at {pod}. The cargo comes off the ship here, so this is the port of discharge (POD). ' +
      (b.rail ? 'A crane lifts our container onto a CPKC rail car.' : 'A crane lifts our container onto a waiting truck chassis.'));
    b.DefTerm('gwB', '{pod}', 'The Canadian seaport where our container comes off the ship (the POD).');
    b.T('gwB', 'pod');
    if (b.rail) b.Xfer('ship', 'train', 'craneB', 0.0, 1.0);
    else {
      b.Show('truckD', 0);
      b.Xfer('ship', 'truckD', 'craneB', 0.0, 1.0);
    }
    b.Tag('Port of discharge (POD)', crB + 200, 330, 12, 0.5);
    b.Hl('dockB', 0);
    b.Focus(s.coastB + 40);

    broker(b); cfia(b); release(b);

    if (b.rail) {
      b.St('Intermodal by rail', 'CPKC railway', OTH, 10, 'train:0.6',
        'A CPKC train carries the container to {dest}. Moving one container by truck, ship, rail and truck without unpacking it is intermodal transport. When one company handles the whole trip under one contract, it’s multimodal.');
      b.DefTerm('railco', 'CPKC', 'Canadian Pacific Kansas City: the railway that hauls our container inland.');
      b.T('intermodal', 'railco');
      b.Move('train', crT + 115, 0.08, 0.9);
      b.Follow('train');
      b.PropTag('CPKC train', 'train', -35, 392, 14, 0, 0, 1);
      b.PropTag('Intermodal: truck, ship, rail, truck', 'train', -120, 380, 40, 0, 0.45, 1);
      b.Hl('railT', 0.9);
      intermodalQuiz(b);
    }

    const stop = b.lcl ? xC2 - 36 : xI - 36;
    b.St(b.lcl ? 'To the destination CFS' : 'The final mile', 'Trucking service + FF', OTH, b.rail ? 12 : 7,
      b.rail ? 'truck:0.3,crane:1.7,clunk:6.2,truck:7.4' : 'truck:0.4',
      (b.rail ? 'At the rail terminal a crane sets the container on a chassis. ' : '') +
      'A trucking service, booked by the freight forwarder at destination, hauls the container ' +
      (b.lcl ? 'to the FF’s destination CFS.' : 'the final miles to the importer in {dest}.') +
      (b.rail ? '' : ' Truck, ship, truck: that’s intermodal transport.'));
    b.T('trucking', 'chassis');
    if (b.rail) {
      b.Show('truckD', 0);
      b.MoveFrom('truckD', crT - 300, crT + 24, 0.0, 0.12);
      b.Xfer('train', 'truckD', 'craneT', 0.1, 0.55);
      b.Move('truckD', stop, 0.62, 0.97);
    } else {
      b.Move('truckD', stop, 0.05, 0.95);
      b.T('intermodal');
      intermodalQuiz(b);
    }
    b.Follow('truckD');
    b.PropTag('Trucking service + chassis', 'truckD', 58, 414, 14, 0, b.rail ? 0.6 : 0.0, 1);
    b.Hl(b.lcl ? 'cfs2' : 'ff2,imp', 0.6);

    if (b.lcl) {
      b.St('Deconsolidation at the CFS', 'Freight forwarder (destination)', OTH, 8, 'clunk:0.6,truck:2.8,clunk:4.8',
        'At the destination CFS, the FF deconsolidates the shared container: every shipper’s cargo is unpacked and sorted. Our 10 pallets go onto a straight truck for delivery.');
      b.T('consol', 'straight');
      b.Xfer('truckD', 'cfsD', 'lift', 0.0, 0.3);
      b.Hide('truckD', 0.32);
      b.Show('stD', 0.3);
      b.MoveFrom('stD', xC2 - 400, xC2 - 52, 0.3, 0.5);
      b.Hop(10, xC2, 420, xC2 - 15, 438, 0.55, 0.9, s.cargoCol);
      b.Cargo('stD', 0, 8, 0.55, 0.9);
      b.Hl('cfs2', 0);
      b.Focus(xC2);
    }

    delivered(b);
  }

  // =====================================================================
  //  AIR FREIGHT
  // =====================================================================
  function air(b) {
    const s = b.S;
    const xE = b.P('exp'), xF = b.P('ff1'), xG = b.P('gsa'), xT1 = b.P('term1'), pA = b.P('apronA');
    const pB = b.P('apronB'), xT2 = b.P('term2'), xI = b.P('imp');

    order(b); hireFF(b);

    b.St('Book space with the GSA', 'FF + GSA', OTH, 7, 'whoosh:0.6,whoosh:3.9,ding:6.2',
      'The FF books space through the GSA (general sales agent), who sells {carrier} space in {country}. Air freight is priced on chargeable weight: the actual weight or the volume weight (L × W × H in cm ÷ 6000), whichever is greater.' +
      (b.I.bulky ? ' Bulky furniture will be charged by volume.' : ''));
    b.DefTerm('carrier', '{carrier}', 'The airline (carrier) that flies our cargo. Its air waybill prefix is 014.');
    b.T('gsa', 'carrier', 'chargeable');
    b.Doc('BOOK', C.orange, xF, xG, 0.1, 0.45);
    b.Doc('OK', C.green, xG, xF, 0.55, 0.9);
    b.Tag('GSA sells {carrier} space', xG, 296, 12, 0.3);
    b.Hl('ff1,gsa', 0);
    b.Focus((xG + xF) / 2);
    b.Q('chargeable', 'Air freight is priced on chargeable weight. What is it?',
      ['Always the actual weight', 'The actual or volume weight, whichever is greater', 'The weight of the plane'], 1,
      'Airlines charge the greater of actual weight and volume weight (L × W × H cm ÷ 6000), so light, bulky cargo pays for its space.');

    goodsReady(b); paperwork(b);

    b.St('To the air cargo terminal', 'Trucking service', OTH, 6, 'truck:0.3',
      'A trucking service’s straight truck takes the pallets to the air cargo terminal at {aod} airport. It’s run by a ground handler, who screens, builds up and loads air cargo.');
    b.DefTerm('gwA', b.O.airport + ' (' + b.O.airCode + ')', 'Airport of departure: where our cargo boards the plane in {country}.');
    b.T('trucking', 'groundh', 'gwA');
    b.Move('stO', xT1 - 52, 0.05, 0.9);
    b.Hl('term1', 0.5);
    b.Follow('stO');

    b.St('Choose a ULD', 'FF + ground handler', OTH, 4, 'pop:0.3',
      'Air cargo flies on ULDs (unit load devices) so a plane can be loaded fast. A PMC is a flat aluminium pallet with a net. An AKE, or LD3, is a contoured container that fits the curved lower deck.');
    b.T('uld');
    b.Decide('Which ULD should carry your {item}?', [
      [0, 'PMC: pallet ULD', 'Flat pallet and net, flexible shape',
        'PMC pallets carry big or odd-shaped loads: the cargo is stacked on the pallet, wrapped and netted.'],
      [1, 'AKE: container ULD', 'Contoured box for the lower deck',
        'AKE (LD3) containers protect smaller pieces and fit the belly hold under the passenger cabin.'],
    ]);
    b.Tag('Empty ULD waiting', xT1, 400, 34, 0.2);
    b.Hl('term1', 0);
    b.Focus(xT1);

    b.St('Screening and build-up', 'Ground handler', OTH, 8, 'beep:1.0,stamp:1.4,clunk:3.4,clunk:5.0',
      'All air cargo must pass security screening, such as an X-ray, before it can fly. Then the ground handler builds our pallets up onto the ULD, weighs it and labels it.' +
      (b.I.dg ? ' Lithium-battery cargo also gets a dangerous goods check.' : ''));
    b.T('screening');
    b.Stamp('X-RAY SCREENED', xT1, 300, 0.15);
    b.Hop(10, xT1 - 15, 438, xT1, 420, 0.4, 0.85, s.cargoCol);
    b.Cargo('stO', 8, 0, 0.4, 0.85);
    b.Move('stO', -300, 0.88, 1.0);
    b.Hl('term1', 0);
    b.Focus(xT1);

    exportCustoms(b, xT1);

    b.St('Air waybills', '{carrier} + FF', EXP, 8, 'whoosh:0.5,whoosh:4.1,ding:7.4',
      'An air waybill is the contract and receipt for air cargo. The airline’s master air waybill (MAWB) goes to the FF; its number starts with 014, Air Canada’s prefix. The FF issues a house air waybill (HAWB) to the exporter.');
    b.T('mawb', 'hawb');
    b.Doc('MAWB', C.master, xG, xF, 0.05, 0.45);
    b.Doc('HAWB', C.amber, xF, xE, 0.5, 0.92);
    b.Tag('MAWB 014-xxxx xxxx', xF, 292, 16, 0.45);
    b.Tag('HAWB: FF to exporter', xE, 292, 16, 0.92);
    b.Hl('exp,ff1,gsa', 0);
    b.FollowDoc((xE + xF) / 2);
    b.Q('hawb', 'For an air shipment, which document does the FF issue to the exporter?',
      ['Master air waybill (MAWB)', 'House air waybill (HAWB)', 'Bill of lading'], 1,
      'MAWB: the airline to the FF. HAWB: the FF to its own shipper.');

    eManifest(b, true);

    b.St('Load the plane', 'Ground handler', OTH, 9, 'truck:0.4,clunk:2.6,crane:6.0,clunk:8.4',
      'A tug tows the ULD on a dolly out to the {carrier} plane at {aod}. A K-loader lifts the ULD up to the cargo door and rolls it inside.');
    b.Xfer('termO', 'dollyO', 'lift', 0.0, 0.2);
    b.Move('dollyO', pA - 80, 0.25, 0.6);
    b.Xfer('dollyO', 'plane', 'lift', 0.65, 0.95);
    b.PropTag('Tug and dolly', 'dollyO', 55, 420, 30, 0, 0.25, 1);
    b.Hl('apronA', 0);
    b.Follow('dollyO');

    b.St('Up, up and away', '{carrier} flight', OTH, 11, 'jet:0.3,jet:1.4',
      'Wheels up: about {hours} hours to {aoa}. ICAO, a UN agency, sets world aviation standards. IATA, the airlines’ association, sets cargo rules like air waybills and dangerous goods. NAV CANADA guides the flight in Canadian skies, and Transport Canada oversees air cargo security.');
    b.T('icao', 'iata', 'navcan', 'tc');
    b.Fly('plane', pB, 0.05, 0.95);
    b.Follow('plane');
    b.PropTag('Hour {n} in the air', 'plane', 0, 330, 12, b.O.airHours, 0.05, 0.95);
    b.Q('icao', 'Which UN agency sets worldwide standards for civil aviation?', ['IATA', 'NAV CANADA', 'ICAO'], 2,
      'ICAO is the UN’s aviation agency. IATA is the airlines’ trade association, and NAV CANADA runs Canadian air traffic control.');

    b.St('Arrive at {aoa}', 'Ground handler + CBSA', OTH, 10, 'clunk:1.4,truck:3.6,clunk:8.6',
      'Touchdown at {aoa}. The ground handler unloads the ULD and tows it to a sufferance warehouse: a CBSA-licensed warehouse where cargo waits, in bond, until the CBSA releases it.');
    b.DefTerm('gwB', b.D.airport + ' (' + b.D.airCode + ')', 'Airport of arrival in Canada, where our cargo lands.');
    b.T('gwB', 'sufferance');
    b.Show('dollyD', 0);
    b.Xfer('plane', 'dollyD', 'lift', 0.05, 0.3);
    b.Move('dollyD', xT2 - 35, 0.35, 0.68);
    b.Xfer('dollyD', 'termD', 'lift', 0.72, 0.95);
    b.Hl('apronB,term2', 0);
    b.Follow('dollyD');

    broker(b); cfia(b); release(b);

    b.St('Breakdown and the final mile', 'Trucking service + FF', OTH, 10, 'clunk:1.0,clunk:2.6,truck:6.0',
      'After release, the ground handler breaks down the ULD. The FF at destination books a trucking service, and a straight truck delivers the pallets to {dest}.' +
      (b.D.city === 'Hamilton' ? ' Toronto Pearson to Hamilton is a short drive.' : '') +
      ' Truck, plane, truck: that’s intermodal transport.');
    b.T('trucking', 'intermodal');
    b.Show('stD', 0);
    b.MoveFrom('stD', xT2 - 400, xT2 - 52, 0.0, 0.2);
    b.Hop(10, xT2, 420, xT2 - 15, 438, 0.25, 0.55, s.cargoCol);
    b.Cargo('stD', 0, 8, 0.25, 0.55);
    b.Move('stD', xI - 52, 0.6, 0.97);
    b.Follow('stD');
    b.Hl('ff2,imp', 0.6);
    intermodalQuiz(b);

    delivered(b);
  }

  // =====================================================================
  //  STEPS SHARED BY BOTH MODES
  // =====================================================================
  function order(b) {
    b.St('The order', 'Importer + exporter', BOTH, 7, 'whoosh:0.9',
      b.C.role === 1
        ? 'You run a business in {city}, {country}: you’re the exporter. A buyer in {dest}, the importer, orders 10 pallets of {item}, shipped by {mode}. Your mission: get them to Canada.'
        : 'You run a business in {dest}: you’re the importer. You order 10 pallets of {item} from an exporter in {city}, {country}, shipped by {mode}. Your mission: get them to {dest}.');
    b.T('importer', 'exporter');
    const xI = b.P('imp'), xE = b.P('exp');
    b.Doc('PO', C.orange, xI, xE, 0.12, 0.95);
    b.Tag('Importer ({dest})', xI, 296, 12, 0);
    b.Tag('Exporter ({city})', xE, 296, 12, 0);
    b.Hl('exp,imp', 0);
    b.FollowDoc(xE);
  }

  function hireFF(b) {
    const xE = b.P('exp'), xF = b.P('ff1');
    b.St('Hire a freight forwarder', 'Exporter + FF', EXP, 5, 'whoosh:0.5,ding:2.8',
      'The exporter hires a freight forwarder (FF), a “travel agent for cargo” that books the {mode} transport, the trucks and the paperwork, so the exporter can focus on the {item}.');
    b.T('ff');
    b.Doc('BOOK', C.orange, xE, xF, 0.1, 0.55);
    b.Tag('Exporter', xE, 296, 12, 0);
    b.Tag('Freight forwarder (FF)', xF, 296, 12, 0);
    b.Tag('Books transport, trucks and paperwork', xF, 330, 70, 0.62);
    b.Hl('exp,ff1', 0);
    b.Focus((xE + xF) / 2);
    b.Q('ff', 'Who acts like a “travel agent for cargo”, booking transport, trucks and paperwork?',
      ['Freight forwarder', 'Customs broker', 'Importer'], 0,
      'The freight forwarder (FF) arranges the move. A customs broker is different: it clears goods through customs.');
  }

  function goodsReady(b) {
    const xE = b.P('exp');
    b.St('Goods get ready', 'Exporter', EXP, 5, 'truck:0.3',
      'Workers pack the {item} onto 10 pallets. A straight truck, with the cab and cargo box on one frame and no separate trailer, brings them to the loading dock.' +
      (b.I.reefer ? ' Fresh mangoes must stay chilled from now on: that’s the cool chain.' : ''));
    b.T('straight');
    if (b.I.reefer) b.T('reefer');
    b.MoveFrom('stO', -300, xE - 50, 0.05, 0.9);
    b.PropTag('Straight truck', 'stO', 52, 408, 12, 0, 0, 1);
    b.Tag('10 pallets of {item}', xE, 300, 30, 0.9);
    b.Hl('exp', 0);
    b.Focus(xE + 40);
  }

  function paperwork(b) {
    const xE = b.P('exp'), xF = b.P('ff1');
    b.St('Paperwork', 'Exporter', EXP, 7, 'whoosh:2.5,ding:5.6',
      'The exporter prepares the packing list (what’s inside), the commercial invoice (what it’s worth) and the certificate of origin (where it comes from). They go to the FF.' +
      (b.I.dg ? ' Lithium batteries are dangerous goods (Class 9), so a signed dangerous goods declaration goes too.' : ''));
    b.T('pl', 'ci', 'coo');
    const labels = ['PL', 'CI', 'COO', 'DGD'], cols = [C.blue, C.green, C.amber, C.red];
    const n = b.I.dg ? 4 : 3;
    for (let i = 0; i < n; i++) b.Doc(labels[i], cols[i], xE, xF - 45 + i * 30, 0.3 + 0.08 * i, 0.55 + 0.08 * i);
    b.Tag('Sent to the freight forwarder', xF, 300, 40, 0.9);
    b.Hl('exp,ff1', 0);
    b.Focus((xE + xF) / 2);
    if (b.I.dg) {
      b.T('dg', 'dgd');
      b.Q('dg', 'Laptops contain lithium batteries. How are they classed for transport?',
        ['General cargo', 'Dangerous goods (Class 9)', 'Perishable cargo'], 1,
        'Lithium batteries are Class 9 dangerous goods: they need a DG declaration, labels and special stowage.');
    } else {
      b.Q('coo', 'Which document proves which country the goods come from?',
        ['Packing list', 'Commercial invoice', 'Certificate of origin'], 2,
        'The certificate of origin (COO) shows where goods come from. The packing list shows what’s inside; the invoice shows the value.');
    }
  }

  function exportCustoms(b, x) {
    b.St('Export customs', 'Exporter + FF', EXP, 5, 'stamp:2.3',
      '{country}’s customs checks the export paperwork, like the commercial invoice and packing list, and clears the cargo to leave the country. This is export customs clearance.');
    b.DocStill('CI', C.green, x - 22, 380, 0);
    b.DocStill('PL', C.blue, x + 22, 380, 0);
    b.Stamp('EXPORT CLEARED', x, 315, 0.35);
    b.Focus(x);
  }

  function eManifest(b, isAir) {
    const xF = b.P('ff1'), xCBSA = b.P('cbsa');
    b.St('e-Manifest to Canada', isAir ? 'Airline + FF to CBSA' : 'Carrier + FF to CBSA', OTH, 9, 'beep:0.9,ding:8.4',
      isAir
        ? 'Canada wants advance notice. The airline and the FF send an e-manifest to the CBSA under ACI (Advance Commercial Information): for air, at least 4 hours before arrival, or at departure if the flight is shorter.'
        : 'Canada wants advance notice. At least 24 hours before the container is loaded, the carrier and the FF send an e-manifest (electronic cargo data) to the CBSA, the Canada Border Services Agency, so it can risk-check the cargo.');
    b.T('emanifest', 'cbsa');
    if (isAir) b.T('aci');
    b.Pulse('e-manifest', xF, xCBSA, 0.1, 0.9);
    b.Stamp('ADVANCE NOTICE RECEIVED', xCBSA, 255, 0.92);
    b.Tag('Sent electronically', xF, 330, 70, 0);
    b.Hl('ff1,cbsa', 0);
    b.FollowDoc(xCBSA);
    if (isAir) {
      b.Q('aci', 'For air cargo, when must the e-manifest data reach the CBSA?',
        ['At least 4 hours before arrival (or at departure for short flights)', '24 hours after landing', 'Only when the truck arrives'], 0,
        'ACI rules for air: at least 4 hours before arrival, or at departure when the flight is shorter than 4 hours.');
    } else {
      b.Q('emanifest', 'What is the e-manifest for?',
        ['Paying duties and taxes', 'Weighing the container', 'Giving the CBSA advance electronic cargo data'], 2,
        'The e-manifest is advance electronic notice of the cargo, so the CBSA can check it before it arrives.');
    }
  }

  function broker(b) {
    const xI = b.P('imp'), xCB = b.P('cb');
    b.St('Customs broker time', 'Importer + broker', IMP, 7, 'whoosh:0.4,whoosh:1.1,whoosh:1.8,ding:5.0',
      'Import customs. The importer hires a customs broker, a licensed expert who clears goods through Canadian customs. The papers, including a Canada Customs Invoice (CCI), go to the broker, and the importer gives the broker permission in CARM.');
    b.T('cb', 'cci');
    const labels = ['CCI', 'PL', 'COO'], cols = [C.blue, C.green, C.amber];
    for (let i = 0; i < 3; i++) b.Doc(labels[i], cols[i], xI, xCB - 30 + i * 30, 0.05 + 0.1 * i, 0.5 + 0.1 * i);
    b.Tag('Importer', xI, 296, 12, 0);
    b.Tag('Customs broker (CB)', xCB, 292, 18, 0.75);
    b.Hl('cb,imp', 0);
    b.FollowDoc(xCB);
  }

  function cfia(b) {
    if (!b.I.food) return;
    const x = b.P('cfia');
    b.St('Food inspection', 'CFIA', IMP, 5, 'stamp:2.0',
      'Fresh mangoes are food, so the CFIA (Canadian Food Inspection Agency) checks them for pests and safety before the CBSA can release them.');
    b.T('cfia');
    b.Stamp('CFIA INSPECTED', x, 290, 0.3);
    b.Hl('cfia', 0);
    b.Focus(x);
  }

  function release(b) {
    const xI = b.P('imp'), xCB = b.P('cb'), xCBSA = b.P('cbsa');
    b.St('CARM, CAD and release', 'Broker + CBSA', IMP, 8, 'whoosh:0.5,pop:2.6,stamp:6.1',
      'The broker files a Commercial Accounting Declaration (CAD) through CARM, the CBSA Assessment and Revenue Management system. CARM works out the duties and taxes, the importer pays, and the CBSA releases the cargo.');
    b.T('cad', 'carm');
    b.Doc('CAD', C.red, xCB, xCBSA, 0.05, 0.35);
    b.Coin(xI, xCBSA, 0.3, 0.65);
    b.Tag('CARM works out duties and taxes', xCB, 292, 18, 0.4);
    b.Stamp('RELEASED', xCBSA, 215, 0.75);
    b.Hl('cbsa,cb,imp', 0);
    b.FollowDoc(xCBSA);
    b.Q('cad', 'What does CAD stand for in Canadian customs?',
      ['Commercial Accounting Declaration', 'Canadian dollars', 'Cargo Arrival Document'], 0,
      'The CAD is filed through CARM, usually by the importer’s customs broker. It replaced the old B3 form.');
  }

  function intermodalQuiz(b) {
    b.Q('intermodal', 'Using several transport modes for one unopened load is called…',
      ['Single-mode transport', 'Cabotage', 'Intermodal or multimodal transport'], 2,
      'Intermodal (or multimodal) transport moves the same load by several modes without unpacking it.');
  }

  function delivered(b) {
    const xI = b.P('imp');
    b.St('Delivered', 'Importer', BOTH, 8, 'fanfare:0.4',
      b.C.role === 1
        ? 'The {item} made it to {dest}. The importer unloads all 10 pallets and your customer is happy. Your job as the exporter is done, and the invoice gets paid.'
        : 'The {item} made it to {dest}. You unload all 10 pallets and your shelves are stocked. Your job as the importer is done.');
    b.T('importer', 'exporter');
    const straight = b.air || b.lcl;
    if (b.lcl) b.Move('stD', xI - 52, 0.0, 0.3);
    if (straight) {
      b.Hop(10, xI - 15, 438, xI, 395, 0.35, 0.8, b.S.cargoCol);
      b.Cargo('stD', 8, 0, 0.35, 0.8);
    } else b.Hop(10, xI, 430, xI + 10, 395, 0.35, 0.8, b.S.cargoCol);
    b.Stamp('DELIVERED', xI, 255, 0.1);
    b.Confetti(0.2);
    b.Hl('imp', 0);
    b.Focus(xI);
  }

  CV.Lessons = { sea, air };
})(globalThis.CV = globalThis.CV || {});
