// sets up my mapbox access token so they can track my usage of their basemap services
mapboxgl.accessToken = 'pk.eyJ1Ijoia3dwMjI1IiwiYSI6ImNqdWQ5NjIydTB3bHMzeW9na3hybGpwZncifQ.z8p_gZgCZfgPdWIG-24ksQ';

// instantiate the map
var map = new mapboxgl.Map({
  container: 'mapContainer',
  style: 'mapbox://styles/mapbox/dark-v9',
  center: [-73.959961,40.734771],
  zoom: 9,
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

// a helper function for looking up colors and descriptions for typologies
var TypologyLookup = (code) => {
  switch (code) {
    case 1:
      return {
        color: '#0000ff',
        description: 'LI - Not Losing Low-Income Households',
      };
    case 2:
      return {
        color: '#653df4',
        description: 'LI - Ongoing Displacement of Low-Income Households',
      };
    case 3:
      return {
        color: '#8a62ee',
        description: 'LI - At Risk of Gentrification',
      };
    case 4:
      return {
        color: '#9b87de',
        description: 'LI - Ongoing Gentrification',
      };
    case 5:
      return {
        color: '#f7cabf',
        description: 'MHI - Advanced Gentrification',
      };
    case 6:
      return {
        color: '#ffa474',
        description: 'MHI - Stable or Early Stage of Exclusion',
      };
    case 7:
      return {
        color: '#e75758',
        description: 'MHI - Ongoing Exclusion',
      };
    case 8:
      return {
        color: '#c0223b',
        description: 'MHI - Advanced Exclusion',
      };
    case 9:
      return {
        color: '#8b0000',
        description: 'VHI - Super Gentrification or Exclusion',
      };
    default:
      return {
        color: '#bab8b6',
        description: 'Missing Data',
      };
  }
};

// use jquery to programmatically create a Legend
// for numbers 1 - 11, get the typology color and description
for (var i=1; i<11; i++) {
  // lookup the typology info for the current iteration
  const TypologyInfo = TypologyLookup(i);

  // this is a simple jQuery template, it will append a div to the legend with the color and description
  $('.legend').append(`
    <div>
      <div class="legend-color-box" style="background-color:${TypologyInfo.color};"></div>
      ${TypologyInfo.description}
    </div>
  `)
}


// we can't add our own sources and layers until the base style is finished loading
map.on('style.load', function() {

  // let's hack the basemap style a bit
  // you can use map.getStyle() in the console to inspect the basemap layers
  map.setPaintProperty('water', 'fill-color', '#a4bee8')

  // this sets up the geojson as a source in the map, which I can use to add visual layers
  map.addSource('typology-data', {
    type: 'geojson',
    data: './data/census-typologies.geojson',
  });

  // add a custom-styled layer for tax lots
  map.addLayer({
    id: 'typology-fill',
    type: 'fill',
    source: 'typology-data',
    paint: {
      'fill-opacity': 0.7,
      'fill-color': {
        type: 'categorical',
        property: "NY January 2019 typology_Type_1.19",
        stops: [
            [
              "LI - Not Losing Low-Income Households",
              TypologyLookup(1).color,
            ],
            [
              "LI - Ongoing Displacement of Low-Income Households",
              TypologyLookup(2).color,
            ],
            [
              "LI - At Risk of Gentrification",
              TypologyLookup(3).color,
            ],
            [
              "LI - Ongoing Gentrification",
              TypologyLookup(4).color,
            ],
            [
              "MHI - Advanced Gentrification",
              TypologyLookup(5).color,
            ],
            [
              "MHI - Stable or Early Stage of Exclusion",
              TypologyLookup(6).color,
            ],
            [
              "MHI - Ongoing Exclusion",
              TypologyLookup(7).color,
            ],
            [
              "MHI - Advanced Exclusion",
              TypologyLookup(8).color,
            ],
            [
              "VHI - Super Gentrification or Exclusion",
              TypologyLookup(9).color,
            ],
            [
              "Missing Data",
              TypologyLookup(10).color,
            ],
          ]
        }
    }
  }, 'waterway-label')

  // add an outline to the tax lots which is only visible after zoom level 14.8
  map.addLayer({
    id: 'typology-line',
    type: 'line',
    source: 'typology-data',
    paint: {
      'line-opacity': 0.7,
      'line-color': 'black',
      'line-opacity': {
        stops: [[14, 0], [14.8, 1]], // zoom-dependent opacity, the lines will fade in between zoom level 14 and 14.8
      }
    }
  });

  // add an empty data source, which we will use to highlight the lot the user is hovering over
  map.addSource('highlight-feature', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  })

  // add a layer for the highlighted lot
  map.addLayer({
    id: 'highlight-line',
    type: 'line',
    source: 'highlight-feature',
    paint: {
      'line-width': 2,
      'line-opacity': 0.7,
      'line-color': 'black',
    }
  });

  // when the mouse clicks, do stuff
  map.on('click', function (e) {
    // query for the features under the mouse, but only in the lots layer
    var features = map.queryRenderedFeatures(e.point, {
        layers: ['typology-fill'],
    });

    // get the first feature from the array of returned features.
    var lot = features[0]
    // console.log(lot)
    if (lot) {  // if there's a lot under the mouse, do stuff
      map.getCanvas().style.cursor = 'pointer';  // make the cursor a pointer

      // lookup the corresponding description for the typology
      var typologyDescription = lot.properties["NY January 2019 typology_Type_1.19"];

      // use jquery to display the address and land use description to the sidebar
      $('#address').text("GEOID: " + lot.properties.geoid);
      $('#landuse').text(typologyDescription);

      // set this lot's polygon feature as the data for the highlight source
      map.getSource('highlight-feature').setData(lot.geometry);
    } else {
      map.getCanvas().style.cursor = 'default'; // make the cursor default

      //add additional layer on top to identify/highlight all areas with same typology as the selected tract
      //doesn't work...only highlights the single selected tract (and throws an error, so commenting it out)
      //
      // map.addLayer({
      //   id: 'typology-selected',
      //   type: 'fill',
      //   source: 'highlight-feature',
      //   paint: {
      //     'fill-opacity': 1,
      //     'fill-color': "{
      //       type: 'categorical',
      //       property: "NY January 2019 typology_Type_1.19",
      //       stops: [
      //           [
      //             typologyDescription,
      //             "blue",
      //           ],
      //         ]"
      //       }
      //   }
      // }, 'waterway-label')

      // reset the highlight source to an empty featurecollection
      map.getSource('highlight-feature').setData({
        type: 'FeatureCollection',
        features: []
      });

    }
  })
})
