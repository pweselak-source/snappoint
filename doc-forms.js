/**
 * Mock form templates for "Dokumenty do złożenia".
 * Each document type gets a few collapsible sections with AI fill samples.
 */

const DOC_FORM_GENERIC = {
  sections: [
    {
      key: "parties",
      title: "Strony i przedmiot",
      subtitle: "Dane wnioskodawcy i zakres wniosku",
      fields: [
        {
          name: "applicantName",
          label: "Wnioskodawca",
          type: "input",
          sample: "Anna i Michał Zielińscy",
        },
        {
          name: "applicantAddress",
          label: "Adres do korespondencji",
          type: "textarea",
          sample: "ul. Leśna 14, 05-510 Konstancin-Jeziorna",
        },
        {
          name: "subject",
          label: "Przedmiot wniosku",
          type: "textarea",
          sample:
            "Wniosek w sprawie zamierzenia budowlanego na działce nr 12/3, obręb Lipki.",
        },
      ],
    },
    {
      key: "site",
      title: "Lokalizacja",
      subtitle: "Działka i dostęp do drogi",
      fields: [
        {
          name: "plotIds",
          label: "Numery działek ewidencyjnych",
          type: "input",
          sample: "dz. ew. 12/3, 12/4, obręb 0012 Lipki",
        },
        {
          name: "siteAddress",
          label: "Adres / lokalizacja terenu",
          type: "input",
          sample: "ul. Brzozowa 7, 05-510 Konstancin-Jeziorna",
        },
      ],
    },
    {
      key: "attachments",
      title: "Załączniki do wniosku",
      subtitle: "Wykaz dokumentów dołączanych do pisma",
      fields: [
        {
          name: "attachmentsNote",
          label: "Wykaz załączników",
          type: "textarea",
          sample:
            "1. Mapa do celów projektowych\n2. Projekt zagospodarowania terenu\n3. Pełnomocnictwo (jeśli dotyczy)",
        },
      ],
    },
  ],
};

const DOC_FORM_TEMPLATES = {
  pb1: {
    sections: [
      {
        key: "header",
        title: "Dane wniosku PB-1",
        subtitle: "Urząd i oznaczenie sprawy",
        fields: [
          {
            name: "officeName",
            label: "Organ administracji architektoniczno-budowlanej",
            type: "input",
            sample: "Starosta Powiatu Piaseczyńskiego",
          },
          {
            name: "caseMark",
            label: "Oznaczenie sprawy (jeśli znane)",
            type: "input",
            sample: "AB.6740.12.2026",
          },
        ],
      },
      {
        key: "investor",
        title: "Inwestor i zamierzenie",
        subtitle: "Strona tytułu wniosku",
        fields: [
          {
            name: "investorName",
            label: "Inwestor",
            type: "input",
            sample: "Anna i Michał Zielińscy",
          },
          {
            name: "intentName",
            label: "Nazwa zamierzenia budowlanego",
            type: "textarea",
            sample:
              "Budowa budynku mieszkalnego jednorodzinnego z garażem wbudowanym",
          },
          {
            name: "objectCategory",
            label: "Kategoria obiektu",
            type: "input",
            sample: "Budynek mieszkalny jednorodzinny",
          },
        ],
      },
      {
        key: "site",
        title: "Teren inwestycji",
        subtitle: "Działki i dostęp komunikacyjny",
        fields: [
          {
            name: "plotIds",
            label: "Działki ewidencyjne",
            type: "input",
            sample: "dz. ew. 12/3, 12/4, obręb 0012 Lipki",
          },
          {
            name: "roadAccess",
            label: "Dostęp do drogi publicznej",
            type: "textarea",
            sample:
              "Istniejący zjazd z drogi gminnej ul. Brzozowej; bez przebudowy zjazdu.",
          },
        ],
      },
    ],
  },
  pb5: {
    sections: [
      {
        key: "owner",
        title: "Oświadczający",
        subtitle: "PB-5 — prawo do dysponowania nieruchomością",
        fields: [
          {
            name: "ownerName",
            label: "Imię i nazwisko / nazwa",
            type: "input",
            sample: "Anna Zielińska",
          },
          {
            name: "ownerId",
            label: "PESEL / NIP",
            type: "input",
            sample: "82031412345",
          },
          {
            name: "ownerAddress",
            label: "Adres",
            type: "textarea",
            sample: "ul. Leśna 14, 05-510 Konstancin-Jeziorna",
          },
        ],
      },
      {
        key: "right",
        title: "Tytuł prawny",
        subtitle: "Podstawa dysponowania terenem",
        fields: [
          {
            name: "legalTitle",
            label: "Tytuł prawny",
            type: "input",
            sample: "Własność — księga wieczysta WA1P/00012345/6",
          },
          {
            name: "plotIds",
            label: "Działki objęte oświadczeniem",
            type: "input",
            sample: "dz. ew. 12/3, 12/4",
          },
        ],
      },
      {
        key: "statement",
        title: "Treść oświadczenia",
        subtitle: "Zakres uprawnienia na cele budowlane",
        fields: [
          {
            name: "statementText",
            label: "Oświadczenie",
            type: "textarea",
            sample:
              "Oświadczam, że posiadam prawo do dysponowania nieruchomością na cele budowlane w zakresie niezbędnym do realizacji zamierzenia budowlanego.",
          },
        ],
      },
    ],
  },
  bioz: {
    sections: [
      {
        key: "scope",
        title: "Zakres BIOZ",
        subtitle: "Informacja dotycząca bezpieczeństwa i ochrony zdrowia",
        fields: [
          {
            name: "worksScope",
            label: "Zakres robót",
            type: "textarea",
            sample:
              "Roboty ziemne, murowane, żelbetowe, dachowe oraz instalacyjne w budynku jednorodzinnym.",
          },
          {
            name: "risks",
            label: "Zagrożenia",
            type: "textarea",
            sample:
              "Prace na wysokości, wykopy, roboty żurawiem, prace w pobliżu instalacji podziemnych.",
          },
        ],
      },
      {
        key: "measures",
        title: "Środki ochrony",
        subtitle: "Zalecenia organizacyjne i techniczne",
        fields: [
          {
            name: "protection",
            label: "Środki zapobiegawcze",
            type: "textarea",
            sample:
              "Oznakowanie stref niebezpiecznych, instruktaż BHP, środki ochrony indywidualnej, nadzór kierownika budowy.",
          },
          {
            name: "storage",
            label: "Miejsca składowania",
            type: "input",
            sample: "Tymczasowy plac składowy w południowej części działki",
          },
        ],
      },
      {
        key: "contacts",
        title: "Osoby odpowiedzialne",
        subtitle: "Koordynacja BIOZ",
        fields: [
          {
            name: "coordinator",
            label: "Koordynator BIOZ",
            type: "input",
            sample: "mgr inż. Piotr Kaleta",
          },
          {
            name: "siteManager",
            label: "Kierownik budowy",
            type: "input",
            sample: "mgr inż. Tomasz Lewandowski, upr. bud. 123/2021",
          },
        ],
      },
    ],
  },
  wz: {
    sections: [
      {
        key: "applicant",
        title: "Wnioskodawca WZ",
        subtitle: "Warunki zabudowy — dane formalne",
        fields: [
          {
            name: "applicantName",
            label: "Wnioskodawca",
            type: "input",
            sample: "Anna i Michał Zielińscy",
          },
          {
            name: "officeName",
            label: "Organ właściwy",
            type: "input",
            sample: "Wójt Gminy Konstancin-Jeziorna",
          },
        ],
      },
      {
        key: "intent",
        title: "Zamierzenie",
        subtitle: "Opis planowanej zabudowy",
        fields: [
          {
            name: "intentName",
            label: "Opis zamierzenia",
            type: "textarea",
            sample:
              "Budowa wolnostojącego budynku mieszkalnego jednorodzinnego z infrastrukturą towarzyszącą.",
          },
          {
            name: "params",
            label: "Parametry zabudowy (orientacyjne)",
            type: "textarea",
            sample:
              "Powierzchnia zabudowy ok. 186 m², wysokość do 9 m, dach dwuspadowy, 2 kondygnacje nadziemne.",
          },
        ],
      },
      {
        key: "site",
        title: "Teren",
        subtitle: "Działka i otoczenie",
        fields: [
          {
            name: "plotIds",
            label: "Działki",
            type: "input",
            sample: "dz. ew. 12/3, obręb Lipki",
          },
          {
            name: "neighbors",
            label: "Sąsiedztwo / linia zabudowy",
            type: "textarea",
            sample:
              "Sąsiedztwo zabudowy jednorodzinnej; kontynuacja istniejącej linii zabudowy od ul. Brzozowej.",
          },
        ],
      },
    ],
  },
  "land-exclusion": {
    sections: [
      {
        key: "land",
        title: "Grunt do wyłączenia",
        subtitle: "Produkcja rolnicza / leśna",
        fields: [
          {
            name: "landClass",
            label: "Klasa / użytek",
            type: "input",
            sample: "R IIIb — grunt orny",
          },
          {
            name: "area",
            label: "Powierzchnia do wyłączenia",
            type: "input",
            sample: "0,1864 ha",
          },
        ],
      },
      {
        key: "purpose",
        title: "Cel wyłączenia",
        subtitle: "Związany z inwestycją budowlaną",
        fields: [
          {
            name: "purpose",
            label: "Cel",
            type: "textarea",
            sample:
              "Wyłączenie gruntów z produkcji rolniczej pod budowę budynku mieszkalnego jednorodzinnego oraz dojazd.",
          },
          {
            name: "plotIds",
            label: "Działki",
            type: "input",
            sample: "dz. ew. 12/3",
          },
        ],
      },
      {
        key: "attachments",
        title: "Załączniki",
        subtitle: "Mapy i wypisy",
        fields: [
          {
            name: "attachmentsNote",
            label: "Wykaz",
            type: "textarea",
            sample:
              "1. Wypis z rejestru gruntów\n2. Mapa ewidencyjna\n3. Projekt zagospodarowania terenu",
          },
        ],
      },
    ],
  },
  "driveway-permit": {
    sections: [
      {
        key: "location",
        title: "Lokalizacja zjazdu",
        subtitle: "Droga publiczna",
        fields: [
          {
            name: "roadName",
            label: "Droga publiczna",
            type: "input",
            sample: "ul. Brzozowa — droga gminna",
          },
          {
            name: "plotIds",
            label: "Działka objęta zjazdem",
            type: "input",
            sample: "dz. ew. 12/3",
          },
        ],
      },
      {
        key: "design",
        title: "Parametry zjazdu",
        subtitle: "Szerokość, nawierzchnia, widoczność",
        fields: [
          {
            name: "width",
            label: "Szerokość zjazdu",
            type: "input",
            sample: "4,5 m",
          },
          {
            name: "surface",
            label: "Nawierzchnia",
            type: "input",
            sample: "Kostka betonowa na podbudowie z kruszywa",
          },
          {
            name: "visibility",
            label: "Warunki widoczności",
            type: "textarea",
            sample:
              "Zapewnione trójkąty widoczności zgodnie z warunkami zarządcy drogi.",
          },
        ],
      },
      {
        key: "manager",
        title: "Zarządca drogi",
        subtitle: "Adresat wniosku",
        fields: [
          {
            name: "roadManager",
            label: "Zarządca",
            type: "input",
            sample: "Urząd Miasta i Gminy Konstancin-Jeziorna",
          },
        ],
      },
    ],
  },
  media: {
    sections: [
      {
        key: "connection",
        title: "Przyłącze",
        subtitle: "Warunki przyłączeniowe",
        fields: [
          {
            name: "mediaType",
            label: "Rodzaj medium",
            type: "input",
            sample: "Woda / kanalizacja / energia elektryczna",
          },
          {
            name: "demand",
            label: "Zapotrzebowanie",
            type: "textarea",
            sample:
              "Budynek jednorodzinny — zapotrzebowanie zgodne z charakterystyką energetyczną i liczbą mieszkańców.",
          },
        ],
      },
      {
        key: "site",
        title: "Punkt przyłączenia",
        subtitle: "Lokalizacja na działce",
        fields: [
          {
            name: "plotIds",
            label: "Działka",
            type: "input",
            sample: "dz. ew. 12/3",
          },
          {
            name: "connectionPoint",
            label: "Proponowany punkt przyłączenia",
            type: "textarea",
            sample:
              "Od strony południowej działki, w linii ogrodzenia od ul. Brzozowej.",
          },
        ],
      },
      {
        key: "operator",
        title: "Operator sieci",
        subtitle: "Adresat wniosku",
        fields: [
          {
            name: "operatorName",
            label: "Operator",
            type: "input",
            sample: "Lokalny operator sieci dystrybucyjnej",
          },
          {
            name: "contact",
            label: "Dane kontaktowe wnioskodawcy",
            type: "input",
            sample: "Anna Zielińska, tel. +48 600 000 000",
          },
        ],
      },
    ],
  },
  "heritage-permit": {
    sections: [
      {
        key: "object",
        title: "Obiekt / strefa",
        subtitle: "Ochrona konserwatorska",
        fields: [
          {
            name: "heritageZone",
            label: "Strefa / wpis",
            type: "input",
            sample: "Strefa ochrony konserwatorskiej A — układ urbanistyczny",
          },
          {
            name: "objectDesc",
            label: "Opis obiektu / terenu",
            type: "textarea",
            sample:
              "Działka w historycznej strukturze zabudowy jednorodzinnej; nowa zabudowa dostosowana skalą i materiałem.",
          },
        ],
      },
      {
        key: "works",
        title: "Zakres robót",
        subtitle: "Wpływ na wartości zabytkowe",
        fields: [
          {
            name: "worksScope",
            label: "Zakres",
            type: "textarea",
            sample:
              "Budowa nowego budynku mieszkalnego; bez rozbiórki obiektów zabytkowych.",
          },
          {
            name: "materials",
            label: "Materiały i forma",
            type: "textarea",
            sample:
              "Tynk mineralny, dachówka ceramiczna, stolarka w kolorze grafitowym — nawiązanie do sąsiedztwa.",
          },
        ],
      },
      {
        key: "authority",
        title: "Organ",
        subtitle: "Konserwator zabytków",
        fields: [
          {
            name: "authority",
            label: "Adresat",
            type: "input",
            sample: "Mazowiecki Wojewódzki Konserwator Zabytków",
          },
        ],
      },
    ],
  },
  dsu: {
    sections: [
      {
        key: "venture",
        title: "Przedsięwzięcie",
        subtitle: "Decyzja o środowiskowych uwarunkowaniach",
        fields: [
          {
            name: "ventureName",
            label: "Nazwa przedsięwzięcia",
            type: "textarea",
            sample:
              "Budowa budynku mieszkalnego jednorodzinnego wraz z infrastrukturą towarzyszącą",
          },
          {
            name: "qualification",
            label: "Kwalifikacja",
            type: "input",
            sample: "Przedsięwzięcie mogące potencjalnie znacząco oddziaływać na środowisko",
          },
        ],
      },
      {
        key: "impact",
        title: "Oddziaływanie",
        subtitle: "Szkic karty informacyjnej",
        fields: [
          {
            name: "impacts",
            label: "Główne oddziaływania",
            type: "textarea",
            sample:
              "Hałas w fazie budowy, zagospodarowanie wód opadowych, gospodarka odpadami komunalnymi w fazie eksploatacji.",
          },
          {
            name: "mitigation",
            label: "Środki minimalizujące",
            type: "textarea",
            sample:
              "Prace w porze dziennej, retencja lokalna, segregacja odpadów, ochrona zieleni istniejącej.",
          },
        ],
      },
      {
        key: "authority",
        title: "Organ",
        subtitle: "Właściwy w sprawie DŚU",
        fields: [
          {
            name: "authority",
            label: "Organ",
            type: "input",
            sample: "Wójt Gminy Konstancin-Jeziorna",
          },
        ],
      },
    ],
  },
  "water-permit": {
    sections: [
      {
        key: "waterworks",
        title: "Zakres wodnoprawny",
        subtitle: "Ingerencja w stosunki wodne",
        fields: [
          {
            name: "waterScope",
            label: "Zakres robót",
            type: "textarea",
            sample:
              "Odprowadzenie wód opadowych z dachu i utwardzeń do rowu melioracyjnego / odbiornika.",
          },
          {
            name: "receiver",
            label: "Odbiornik",
            type: "input",
            sample: "Rów melioracyjny wzdłuż ul. Brzozowej",
          },
        ],
      },
      {
        key: "params",
        title: "Parametry",
        subtitle: "Ilości i urządzenia",
        fields: [
          {
            name: "flow",
            label: "Przepływ / retencja",
            type: "textarea",
            sample:
              "Retencja lokalna w studni chłonnej; zrzut regulowany zgodnie z warunkami zarządcy.",
          },
          {
            name: "devices",
            label: "Urządzenia",
            type: "input",
            sample: "Studnia chłonna Ø1000 + separator (jeśli wymagany)",
          },
        ],
      },
      {
        key: "authority",
        title: "Organ",
        subtitle: "Pozwolenie wodnoprawne",
        fields: [
          {
            name: "authority",
            label: "Organ",
            type: "input",
            sample: "Dyrektor Zarządu Zlewni Wód Polskich",
          },
        ],
      },
    ],
  },
  generic: DOC_FORM_GENERIC,
};

function resolveDocFormTemplate(docId) {
  if (DOC_FORM_TEMPLATES[docId]) return DOC_FORM_TEMPLATES[docId];
  if (String(docId || "").startsWith("media-")) return DOC_FORM_TEMPLATES.media;
  return DOC_FORM_TEMPLATES.generic;
}

function docFieldKey(docId, fieldName) {
  return `${docId}__${fieldName}`;
}

function listDocFormFields(docId) {
  const template = resolveDocFormTemplate(docId);
  return template.sections.flatMap((section) =>
    section.fields.map((field) => ({
      ...field,
      sectionKey: section.key,
      fullName: docFieldKey(docId, field.name),
    }))
  );
}

function getDocFormSample(docId, fieldName) {
  const field = listDocFormFields(docId).find((item) => item.name === fieldName);
  return field?.sample || "";
}

function countDocFormFill(docId, saved = {}) {
  const fields = listDocFormFields(docId);
  if (!fields.length) return { filled: 0, total: 0, percent: 0 };
  const filled = fields.filter((field) => {
    const value = saved[field.name];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  return {
    filled,
    total: fields.length,
    percent: Math.round((filled / fields.length) * 100),
  };
}
