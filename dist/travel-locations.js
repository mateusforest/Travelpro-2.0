(() => {
  'use strict';
  // Airport names and IATA codes: OurAirports public-domain dataset, verified 2026-10-08.
  const metadata = {"source": "https://ourairports.com/data/", "dataset": "https://ourairports.com/data/airports.csv", "retrievedAt": "2026-10-08", "sha256": "06bb430e3929969865065798765beaab4063e4695fbb32d83623b103a613e78f", "license": "Public Domain"};
  const airports = [
  {
    "code": "POA",
    "city": "Porto Alegre",
    "name": "Porto Alegre-Salgado Filho International Airport",
    "country": "Brasil",
    "label": "Porto Alegre · POA — Porto Alegre-Salgado Filho International Airport"
  },
  {
    "code": "CXJ",
    "city": "Caxias do Sul",
    "name": "Hugo Cantergiani Regional Airport",
    "country": "Brasil",
    "label": "Caxias do Sul · CXJ — Hugo Cantergiani Regional Airport"
  },
  {
    "code": "PFB",
    "city": "Passo Fundo",
    "name": "Lauro Kurtz Airport",
    "country": "Brasil",
    "label": "Passo Fundo · PFB — Lauro Kurtz Airport"
  },
  {
    "code": "PET",
    "city": "Pelotas",
    "name": "João Simões Lopes Neto International Airport",
    "country": "Brasil",
    "label": "Pelotas · PET — João Simões Lopes Neto International Airport"
  },
  {
    "code": "GEL",
    "city": "Santo Ângelo",
    "name": "Santo Ângelo Airport",
    "country": "Brasil",
    "label": "Santo Ângelo · GEL — Santo Ângelo Airport"
  },
  {
    "code": "FLN",
    "city": "Florianópolis",
    "name": "Hercílio Luz International Airport",
    "country": "Brasil",
    "label": "Florianópolis · FLN — Hercílio Luz International Airport"
  },
  {
    "code": "NVT",
    "city": "Navegantes",
    "name": "Ministro Victor Konder International Airport",
    "country": "Brasil",
    "label": "Navegantes · NVT — Ministro Victor Konder International Airport"
  },
  {
    "code": "JOI",
    "city": "Joinville",
    "name": "Lauro Carneiro de Loyola Airport",
    "country": "Brasil",
    "label": "Joinville · JOI — Lauro Carneiro de Loyola Airport"
  },
  {
    "code": "CWB",
    "city": "Curitiba",
    "name": "Curitiba-Afonso Pena International Airport",
    "country": "Brasil",
    "label": "Curitiba · CWB — Curitiba-Afonso Pena International Airport"
  },
  {
    "code": "IGU",
    "city": "Foz do Iguaçu",
    "name": "Cataratas International Airport",
    "country": "Brasil",
    "label": "Foz do Iguaçu · IGU — Cataratas International Airport"
  },
  {
    "code": "GRU",
    "city": "São Paulo",
    "name": "São Paulo/Guarulhos–Governor André Franco Montoro International Airport",
    "country": "Brasil",
    "label": "São Paulo · GRU — São Paulo/Guarulhos–Governor André Franco Montoro International Airport"
  },
  {
    "code": "CGH",
    "city": "São Paulo",
    "name": "Congonhas–Deputado Freitas Nobre Airport",
    "country": "Brasil",
    "label": "São Paulo · CGH — Congonhas–Deputado Freitas Nobre Airport"
  },
  {
    "code": "VCP",
    "city": "Campinas",
    "name": "Viracopos International Airport",
    "country": "Brasil",
    "label": "Campinas · VCP — Viracopos International Airport"
  },
  {
    "code": "GIG",
    "city": "Rio de Janeiro",
    "name": "Rio de Janeiro Galeão – Tom Jobim International Airport",
    "country": "Brasil",
    "label": "Rio de Janeiro · GIG — Rio de Janeiro Galeão – Tom Jobim International Airport"
  },
  {
    "code": "SDU",
    "city": "Rio de Janeiro",
    "name": "Santos Dumont Airport",
    "country": "Brasil",
    "label": "Rio de Janeiro · SDU — Santos Dumont Airport"
  },
  {
    "code": "CNF",
    "city": "Belo Horizonte",
    "name": "Tancredo Neves International Airport",
    "country": "Brasil",
    "label": "Belo Horizonte · CNF — Tancredo Neves International Airport"
  },
  {
    "code": "BSB",
    "city": "Brasília",
    "name": "Presidente Juscelino Kubitschek International Airport",
    "country": "Brasil",
    "label": "Brasília · BSB — Presidente Juscelino Kubitschek International Airport"
  },
  {
    "code": "GYN",
    "city": "Goiânia",
    "name": "Santa Genoveva International Airport",
    "country": "Brasil",
    "label": "Goiânia · GYN — Santa Genoveva International Airport"
  },
  {
    "code": "CGB",
    "city": "Cuiabá",
    "name": "Várzea Grande–Marechal Rondon International Airport",
    "country": "Brasil",
    "label": "Cuiabá · CGB — Várzea Grande–Marechal Rondon International Airport"
  },
  {
    "code": "CGR",
    "city": "Campo Grande",
    "name": "Campo Grande Airport",
    "country": "Brasil",
    "label": "Campo Grande · CGR — Campo Grande Airport"
  },
  {
    "code": "VIX",
    "city": "Vitória",
    "name": "Eurico de Aguiar Salles International Airport",
    "country": "Brasil",
    "label": "Vitória · VIX — Eurico de Aguiar Salles International Airport"
  },
  {
    "code": "SSA",
    "city": "Salvador",
    "name": "Deputado Luiz Eduardo Magalhães International Airport",
    "country": "Brasil",
    "label": "Salvador · SSA — Deputado Luiz Eduardo Magalhães International Airport"
  },
  {
    "code": "REC",
    "city": "Recife",
    "name": "Recife/Guararapes - Gilberto Freyre International Airport",
    "country": "Brasil",
    "label": "Recife · REC — Recife/Guararapes - Gilberto Freyre International Airport"
  },
  {
    "code": "FOR",
    "city": "Fortaleza",
    "name": "Pinto Martins International Airport",
    "country": "Brasil",
    "label": "Fortaleza · FOR — Pinto Martins International Airport"
  },
  {
    "code": "NAT",
    "city": "Natal",
    "name": "Rio Grande do Norte/São Gonçalo do Amarante–Governador Aluízio Alves International Airport",
    "country": "Brasil",
    "label": "Natal · NAT — Rio Grande do Norte/São Gonçalo do Amarante–Governador Aluízio Alves International Airport"
  },
  {
    "code": "MCZ",
    "city": "Maceió",
    "name": "Zumbi dos Palmares International Airport",
    "country": "Brasil",
    "label": "Maceió · MCZ — Zumbi dos Palmares International Airport"
  },
  {
    "code": "JPA",
    "city": "João Pessoa",
    "name": "Presidente Castro Pinto International Airport",
    "country": "Brasil",
    "label": "João Pessoa · JPA — Presidente Castro Pinto International Airport"
  },
  {
    "code": "AJU",
    "city": "Aracaju",
    "name": "Aracaju - Santa Maria Airport",
    "country": "Brasil",
    "label": "Aracaju · AJU — Aracaju - Santa Maria Airport"
  },
  {
    "code": "SLZ",
    "city": "São Luís",
    "name": "Marechal Cunha Machado International Airport",
    "country": "Brasil",
    "label": "São Luís · SLZ — Marechal Cunha Machado International Airport"
  },
  {
    "code": "THE",
    "city": "Teresina",
    "name": "Senador Petrônio Portela Airport",
    "country": "Brasil",
    "label": "Teresina · THE — Senador Petrônio Portela Airport"
  },
  {
    "code": "MAO",
    "city": "Manaus",
    "name": "Eduardo Gomes International Airport",
    "country": "Brasil",
    "label": "Manaus · MAO — Eduardo Gomes International Airport"
  },
  {
    "code": "BEL",
    "city": "Belém",
    "name": "Val de Cans/Júlio Cezar Ribeiro International Airport",
    "country": "Brasil",
    "label": "Belém · BEL — Val de Cans/Júlio Cezar Ribeiro International Airport"
  },
  {
    "code": "BPS",
    "city": "Porto Seguro",
    "name": "Porto Seguro International Airport",
    "country": "Brasil",
    "label": "Porto Seguro · BPS — Porto Seguro International Airport"
  },
  {
    "code": "IOS",
    "city": "Ilhéus",
    "name": "Bahia - Jorge Amado Airport",
    "country": "Brasil",
    "label": "Ilhéus · IOS — Bahia - Jorge Amado Airport"
  },
  {
    "code": "PMW",
    "city": "Palmas",
    "name": "Brigadeiro Lysias Rodrigues Airport",
    "country": "Brasil",
    "label": "Palmas · PMW — Brigadeiro Lysias Rodrigues Airport"
  },
  {
    "code": "PVH",
    "city": "Porto Velho",
    "name": "Governador Jorge Teixeira de Oliveira International Airport",
    "country": "Brasil",
    "label": "Porto Velho · PVH — Governador Jorge Teixeira de Oliveira International Airport"
  },
  {
    "code": "RBR",
    "city": "Rio Branco",
    "name": "Rio Branco-Plácido de Castro International Airport",
    "country": "Brasil",
    "label": "Rio Branco · RBR — Rio Branco-Plácido de Castro International Airport"
  },
  {
    "code": "MCP",
    "city": "Macapá",
    "name": "Macapá - Alberto Alcolumbre International Airport",
    "country": "Brasil",
    "label": "Macapá · MCP — Macapá - Alberto Alcolumbre International Airport"
  },
  {
    "code": "BVB",
    "city": "Boa Vista",
    "name": "Atlas Brasil Cantanhede International Airport",
    "country": "Brasil",
    "label": "Boa Vista · BVB — Atlas Brasil Cantanhede International Airport"
  },
  {
    "code": "UDI",
    "city": "Uberlândia",
    "name": "Ten. Cel. Aviador César Bombonato Airport",
    "country": "Brasil",
    "label": "Uberlândia · UDI — Ten. Cel. Aviador César Bombonato Airport"
  },
  {
    "code": "RAO",
    "city": "Ribeirão Preto",
    "name": "Leite Lopes Airport",
    "country": "Brasil",
    "label": "Ribeirão Preto · RAO — Leite Lopes Airport"
  },
  {
    "code": "MVD",
    "city": "Montevidéu",
    "name": "Carrasco General Cesáreo L. Berisso International Airport",
    "country": "Uruguai",
    "label": "Montevidéu · MVD — Carrasco General Cesáreo L. Berisso International Airport"
  },
  {
    "code": "EZE",
    "city": "Buenos Aires",
    "name": "Ezeiza International Airport - Ministro Pistarini",
    "country": "Argentina",
    "label": "Buenos Aires · EZE — Ezeiza International Airport - Ministro Pistarini"
  },
  {
    "code": "AEP",
    "city": "Buenos Aires",
    "name": "Aeroparque Jorge Newbery",
    "country": "Argentina",
    "label": "Buenos Aires · AEP — Aeroparque Jorge Newbery"
  },
  {
    "code": "SCL",
    "city": "Santiago",
    "name": "Comodoro Arturo Merino Benítez International Airport",
    "country": "Chile",
    "label": "Santiago · SCL — Comodoro Arturo Merino Benítez International Airport"
  },
  {
    "code": "LIM",
    "city": "Lima",
    "name": "Jorge Chávez International Airport",
    "country": "Peru",
    "label": "Lima · LIM — Jorge Chávez International Airport"
  },
  {
    "code": "BOG",
    "city": "Bogotá",
    "name": "El Dorado International Airport",
    "country": "Colômbia",
    "label": "Bogotá · BOG — El Dorado International Airport"
  },
  {
    "code": "CTG",
    "city": "Cartagena",
    "name": "Rafael Nuñez International Airport",
    "country": "Colômbia",
    "label": "Cartagena · CTG — Rafael Nuñez International Airport"
  },
  {
    "code": "PTY",
    "city": "Cidade do Panamá",
    "name": "Tocumen International Airport",
    "country": "Panamá",
    "label": "Cidade do Panamá · PTY — Tocumen International Airport"
  },
  {
    "code": "CUN",
    "city": "Cancún",
    "name": "Cancún International Airport",
    "country": "México",
    "label": "Cancún · CUN — Cancún International Airport"
  },
  {
    "code": "MEX",
    "city": "Cidade do México",
    "name": "Mexico City Benito Juárez International Airport",
    "country": "México",
    "label": "Cidade do México · MEX — Mexico City Benito Juárez International Airport"
  },
  {
    "code": "MIA",
    "city": "Miami",
    "name": "Miami International Airport",
    "country": "Estados Unidos",
    "label": "Miami · MIA — Miami International Airport"
  },
  {
    "code": "FLL",
    "city": "Fort Lauderdale",
    "name": "Fort Lauderdale Hollywood International Airport",
    "country": "Estados Unidos",
    "label": "Fort Lauderdale · FLL — Fort Lauderdale Hollywood International Airport"
  },
  {
    "code": "MCO",
    "city": "Orlando",
    "name": "Orlando International Airport",
    "country": "Estados Unidos",
    "label": "Orlando · MCO — Orlando International Airport"
  },
  {
    "code": "JFK",
    "city": "Nova York",
    "name": "John F. Kennedy International Airport",
    "country": "Estados Unidos",
    "label": "Nova York · JFK — John F. Kennedy International Airport"
  },
  {
    "code": "LGA",
    "city": "Nova York",
    "name": "LaGuardia Airport",
    "country": "Estados Unidos",
    "label": "Nova York · LGA — LaGuardia Airport"
  },
  {
    "code": "EWR",
    "city": "Nova York",
    "name": "Newark Liberty International Airport",
    "country": "Estados Unidos",
    "label": "Nova York · EWR — Newark Liberty International Airport"
  },
  {
    "code": "LAX",
    "city": "Los Angeles",
    "name": "Los Angeles International Airport",
    "country": "Estados Unidos",
    "label": "Los Angeles · LAX — Los Angeles International Airport"
  },
  {
    "code": "SFO",
    "city": "São Francisco",
    "name": "San Francisco International Airport",
    "country": "Estados Unidos",
    "label": "São Francisco · SFO — San Francisco International Airport"
  },
  {
    "code": "YYZ",
    "city": "Toronto",
    "name": "Toronto Pearson International Airport",
    "country": "Canadá",
    "label": "Toronto · YYZ — Toronto Pearson International Airport"
  },
  {
    "code": "YUL",
    "city": "Montreal",
    "name": "Montreal / Pierre Elliott Trudeau International Airport",
    "country": "Canadá",
    "label": "Montreal · YUL — Montreal / Pierre Elliott Trudeau International Airport"
  },
  {
    "code": "LIS",
    "city": "Lisboa",
    "name": "Lisbon Humberto Delgado Airport",
    "country": "Portugal",
    "label": "Lisboa · LIS — Lisbon Humberto Delgado Airport"
  },
  {
    "code": "OPO",
    "city": "Porto",
    "name": "Francisco de Sá Carneiro Airport",
    "country": "Portugal",
    "label": "Porto · OPO — Francisco de Sá Carneiro Airport"
  },
  {
    "code": "MAD",
    "city": "Madrid",
    "name": "Adolfo Suárez Madrid–Barajas Airport",
    "country": "Espanha",
    "label": "Madrid · MAD — Adolfo Suárez Madrid–Barajas Airport"
  },
  {
    "code": "BCN",
    "city": "Barcelona",
    "name": "Josep Tarradellas Barcelona-El Prat Airport",
    "country": "Espanha",
    "label": "Barcelona · BCN — Josep Tarradellas Barcelona-El Prat Airport"
  },
  {
    "code": "CDG",
    "city": "Paris",
    "name": "Charles de Gaulle International Airport",
    "country": "França",
    "label": "Paris · CDG — Charles de Gaulle International Airport"
  },
  {
    "code": "ORY",
    "city": "Paris",
    "name": "Paris-Orly Airport",
    "country": "França",
    "label": "Paris · ORY — Paris-Orly Airport"
  },
  {
    "code": "LHR",
    "city": "Londres",
    "name": "London Heathrow Airport",
    "country": "Reino Unido",
    "label": "Londres · LHR — London Heathrow Airport"
  },
  {
    "code": "LGW",
    "city": "Londres",
    "name": "London Gatwick Airport",
    "country": "Reino Unido",
    "label": "Londres · LGW — London Gatwick Airport"
  },
  {
    "code": "FCO",
    "city": "Roma",
    "name": "Rome–Fiumicino Leonardo da Vinci International Airport",
    "country": "Itália",
    "label": "Roma · FCO — Rome–Fiumicino Leonardo da Vinci International Airport"
  },
  {
    "code": "CIA",
    "city": "Roma",
    "name": "Ciampino–G. B. Pastine International Airport",
    "country": "Itália",
    "label": "Roma · CIA — Ciampino–G. B. Pastine International Airport"
  },
  {
    "code": "MXP",
    "city": "Milão",
    "name": "Milan Malpensa International Airport",
    "country": "Itália",
    "label": "Milão · MXP — Milan Malpensa International Airport"
  },
  {
    "code": "LIN",
    "city": "Milão",
    "name": "Milano Linate Airport",
    "country": "Itália",
    "label": "Milão · LIN — Milano Linate Airport"
  },
  {
    "code": "FLR",
    "city": "Florença",
    "name": "Florence Airport, Peretola",
    "country": "Itália",
    "label": "Florença · FLR — Florence Airport, Peretola"
  },
  {
    "code": "ATH",
    "city": "Atenas",
    "name": "Athens Eleftherios Venizelos International Airport",
    "country": "Grécia",
    "label": "Atenas · ATH — Athens Eleftherios Venizelos International Airport"
  },
  {
    "code": "FRA",
    "city": "Frankfurt",
    "name": "Frankfurt Main Airport",
    "country": "Alemanha",
    "label": "Frankfurt · FRA — Frankfurt Main Airport"
  },
  {
    "code": "MUC",
    "city": "Munique",
    "name": "Munich Airport",
    "country": "Alemanha",
    "label": "Munique · MUC — Munich Airport"
  },
  {
    "code": "AMS",
    "city": "Amsterdã",
    "name": "Amsterdam Airport Schiphol",
    "country": "Países Baixos",
    "label": "Amsterdã · AMS — Amsterdam Airport Schiphol"
  },
  {
    "code": "ZRH",
    "city": "Zurique",
    "name": "Zürich Airport",
    "country": "Suíça",
    "label": "Zurique · ZRH — Zürich Airport"
  },
  {
    "code": "VIE",
    "city": "Viena",
    "name": "Vienna International Airport",
    "country": "Áustria",
    "label": "Viena · VIE — Vienna International Airport"
  },
  {
    "code": "BUD",
    "city": "Budapeste",
    "name": "Budapest Liszt Ferenc International Airport",
    "country": "Hungria",
    "label": "Budapeste · BUD — Budapest Liszt Ferenc International Airport"
  },
  {
    "code": "PRG",
    "city": "Praga",
    "name": "Václav Havel Airport Prague",
    "country": "Tchéquia",
    "label": "Praga · PRG — Václav Havel Airport Prague"
  },
  {
    "code": "KRK",
    "city": "Cracóvia",
    "name": "Kraków John Paul II International Airport",
    "country": "Polônia",
    "label": "Cracóvia · KRK — Kraków John Paul II International Airport"
  },
  {
    "code": "EDI",
    "city": "Edimburgo",
    "name": "Edinburgh Airport",
    "country": "Reino Unido",
    "label": "Edimburgo · EDI — Edinburgh Airport"
  },
  {
    "code": "IST",
    "city": "Istambul",
    "name": "İstanbul Airport",
    "country": "Turquia",
    "label": "Istambul · IST — İstanbul Airport"
  },
  {
    "code": "SAW",
    "city": "Istambul",
    "name": "Istanbul Sabiha Gökçen International Airport",
    "country": "Turquia",
    "label": "Istambul · SAW — Istanbul Sabiha Gökçen International Airport"
  },
  {
    "code": "CAI",
    "city": "Cairo",
    "name": "Cairo International Airport",
    "country": "Egito",
    "label": "Cairo · CAI — Cairo International Airport"
  },
  {
    "code": "RAK",
    "city": "Marrakech",
    "name": "Marrakesh Menara Airport",
    "country": "Marrocos",
    "label": "Marrakech · RAK — Marrakesh Menara Airport"
  },
  {
    "code": "HND",
    "city": "Tóquio",
    "name": "Tokyo Haneda International Airport",
    "country": "Japão",
    "label": "Tóquio · HND — Tokyo Haneda International Airport"
  },
  {
    "code": "NRT",
    "city": "Tóquio",
    "name": "Narita International Airport",
    "country": "Japão",
    "label": "Tóquio · NRT — Narita International Airport"
  },
  {
    "code": "DXB",
    "city": "Dubai",
    "name": "Dubai International Airport",
    "country": "Emirados Árabes Unidos",
    "label": "Dubai · DXB — Dubai International Airport"
  },
  {
    "code": "DOH",
    "city": "Doha",
    "name": "Hamad International Airport",
    "country": "Catar",
    "label": "Doha · DOH — Hamad International Airport"
  }
];
  const destinations = [
  {
    "name": "Porto Alegre",
    "country": "Brasil"
  },
  {
    "name": "Caxias do Sul",
    "country": "Brasil"
  },
  {
    "name": "Passo Fundo",
    "country": "Brasil"
  },
  {
    "name": "Pelotas",
    "country": "Brasil"
  },
  {
    "name": "Santo Ângelo",
    "country": "Brasil"
  },
  {
    "name": "Florianópolis",
    "country": "Brasil"
  },
  {
    "name": "Navegantes",
    "country": "Brasil"
  },
  {
    "name": "Joinville",
    "country": "Brasil"
  },
  {
    "name": "Curitiba",
    "country": "Brasil"
  },
  {
    "name": "Foz do Iguaçu",
    "country": "Brasil"
  },
  {
    "name": "São Paulo",
    "country": "Brasil"
  },
  {
    "name": "Campinas",
    "country": "Brasil"
  },
  {
    "name": "Rio de Janeiro",
    "country": "Brasil"
  },
  {
    "name": "Belo Horizonte",
    "country": "Brasil"
  },
  {
    "name": "Brasília",
    "country": "Brasil"
  },
  {
    "name": "Goiânia",
    "country": "Brasil"
  },
  {
    "name": "Cuiabá",
    "country": "Brasil"
  },
  {
    "name": "Campo Grande",
    "country": "Brasil"
  },
  {
    "name": "Vitória",
    "country": "Brasil"
  },
  {
    "name": "Salvador",
    "country": "Brasil"
  },
  {
    "name": "Recife",
    "country": "Brasil"
  },
  {
    "name": "Fortaleza",
    "country": "Brasil"
  },
  {
    "name": "Natal",
    "country": "Brasil"
  },
  {
    "name": "Maceió",
    "country": "Brasil"
  },
  {
    "name": "João Pessoa",
    "country": "Brasil"
  },
  {
    "name": "Aracaju",
    "country": "Brasil"
  },
  {
    "name": "São Luís",
    "country": "Brasil"
  },
  {
    "name": "Teresina",
    "country": "Brasil"
  },
  {
    "name": "Manaus",
    "country": "Brasil"
  },
  {
    "name": "Belém",
    "country": "Brasil"
  },
  {
    "name": "Porto Seguro",
    "country": "Brasil"
  },
  {
    "name": "Ilhéus",
    "country": "Brasil"
  },
  {
    "name": "Palmas",
    "country": "Brasil"
  },
  {
    "name": "Porto Velho",
    "country": "Brasil"
  },
  {
    "name": "Rio Branco",
    "country": "Brasil"
  },
  {
    "name": "Macapá",
    "country": "Brasil"
  },
  {
    "name": "Boa Vista",
    "country": "Brasil"
  },
  {
    "name": "Uberlândia",
    "country": "Brasil"
  },
  {
    "name": "Ribeirão Preto",
    "country": "Brasil"
  },
  {
    "name": "Montevidéu",
    "country": "Uruguai"
  },
  {
    "name": "Buenos Aires",
    "country": "Argentina"
  },
  {
    "name": "Santiago",
    "country": "Chile"
  },
  {
    "name": "Lima",
    "country": "Peru"
  },
  {
    "name": "Bogotá",
    "country": "Colômbia"
  },
  {
    "name": "Cartagena",
    "country": "Colômbia"
  },
  {
    "name": "Cidade do Panamá",
    "country": "Panamá"
  },
  {
    "name": "Cancún",
    "country": "México"
  },
  {
    "name": "Cidade do México",
    "country": "México"
  },
  {
    "name": "Miami",
    "country": "Estados Unidos"
  },
  {
    "name": "Fort Lauderdale",
    "country": "Estados Unidos"
  },
  {
    "name": "Orlando",
    "country": "Estados Unidos"
  },
  {
    "name": "Nova York",
    "country": "Estados Unidos"
  },
  {
    "name": "Los Angeles",
    "country": "Estados Unidos"
  },
  {
    "name": "São Francisco",
    "country": "Estados Unidos"
  },
  {
    "name": "Toronto",
    "country": "Canadá"
  },
  {
    "name": "Montreal",
    "country": "Canadá"
  },
  {
    "name": "Lisboa",
    "country": "Portugal"
  },
  {
    "name": "Porto",
    "country": "Portugal"
  },
  {
    "name": "Madrid",
    "country": "Espanha"
  },
  {
    "name": "Barcelona",
    "country": "Espanha"
  },
  {
    "name": "Paris",
    "country": "França"
  },
  {
    "name": "Londres",
    "country": "Reino Unido"
  },
  {
    "name": "Roma",
    "country": "Itália"
  },
  {
    "name": "Milão",
    "country": "Itália"
  },
  {
    "name": "Florença",
    "country": "Itália"
  },
  {
    "name": "Atenas",
    "country": "Grécia"
  },
  {
    "name": "Frankfurt",
    "country": "Alemanha"
  },
  {
    "name": "Munique",
    "country": "Alemanha"
  },
  {
    "name": "Amsterdã",
    "country": "Países Baixos"
  },
  {
    "name": "Zurique",
    "country": "Suíça"
  },
  {
    "name": "Viena",
    "country": "Áustria"
  },
  {
    "name": "Budapeste",
    "country": "Hungria"
  },
  {
    "name": "Praga",
    "country": "Tchéquia"
  },
  {
    "name": "Cracóvia",
    "country": "Polônia"
  },
  {
    "name": "Edimburgo",
    "country": "Reino Unido"
  },
  {
    "name": "Istambul",
    "country": "Turquia"
  },
  {
    "name": "Cairo",
    "country": "Egito"
  },
  {
    "name": "Marrakech",
    "country": "Marrocos"
  },
  {
    "name": "Tóquio",
    "country": "Japão"
  },
  {
    "name": "Dubai",
    "country": "Emirados Árabes Unidos"
  },
  {
    "name": "Doha",
    "country": "Catar"
  },
  {
    "name": "Gramado",
    "country": "Brasil"
  },
  {
    "name": "Canela",
    "country": "Brasil"
  },
  {
    "name": "Bento Gonçalves",
    "country": "Brasil"
  },
  {
    "name": "Rio Grande",
    "country": "Brasil"
  },
  {
    "name": "Granada",
    "country": "Espanha"
  },
  {
    "name": "Sevilha",
    "country": "Espanha"
  }
];
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const boundedLimit = value => Number.isInteger(value) ? Math.max(1,Math.min(value,20)) : 8;
  const aliases = new Map([['new york','nova york'],['tokyo','toquio'],['rome','roma'],['london','londres'],['milan','milao'],['florence','florenca'],['lisbon','lisboa'],['amsterdam','amsterda'],['munich','munique']]);
  const canonical = value => aliases.get(normalize(value)) || normalize(value);
  function airportSuggestions(value,limit=8) {
    const query=canonical(value),tokens=query.split(' ').filter(Boolean);
    return airports.filter(item=>tokens.every(token=>normalize(item.label+' '+item.country).includes(token)))
      .sort((a,b)=>{
        const rank=item=>normalize(item.code)===query?0:normalize(item.city)===query?1:normalize(item.code).startsWith(query)?2:3;
        return rank(a)-rank(b)||a.city.localeCompare(b.city,'pt-BR')||a.code.localeCompare(b.code);
      }).slice(0,boundedLimit(limit));
  }
  function destinationSuggestions(value,limit=8) {
    const query=canonical(value),tokens=query.split(' ').filter(Boolean);
    return destinations.filter(item=>tokens.every(token=>normalize(item.name+' '+item.country).includes(token)))
      .sort((a,b)=>Number(normalize(b.name)===query)-Number(normalize(a.name)===query)||a.name.localeCompare(b.name,'pt-BR'))
      .slice(0,boundedLimit(limit));
  }
  function resolveAirport(value) {
    const input=String(value??'').trim(),query=canonical(input);
    if(!query)return null;
    const code=airports.find(item=>normalize(item.code)===query);
    if(code)return code.code;
    const exact=airports.filter(item=>[item.label,item.city,item.name].some(candidate=>normalize(candidate)===query));
    if(exact.length===1)return exact[0].code;
    if(exact.length>1)return null;
    // Keep explicitly entered IATA codes usable beyond this suggestion catalog.
    return /^[A-Z]{3}$/.test(input)?input:null;
  }
  airports.forEach(Object.freeze);destinations.forEach(Object.freeze);
  window.TravelLocations=Object.freeze({metadata:Object.freeze(metadata),airports:Object.freeze(airports),destinations:Object.freeze(destinations),airportSuggestions,destinationSuggestions,resolveAirport});
})();
