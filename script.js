function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function promiseData(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const request = await fetch(url);
      const json = await request.json();
      resolve(json);
    } catch (err) {
      reject(err);
    }
  });
}

let map;
let parkMarkers = [];
let parksData = [];


// Map
function initializeMap(parksData) {
  mapboxgl.accessToken = 'pk.eyJ1Ijoia2tpaWltIiwiYSI6ImNtYTh1bXVjazFqcnAya3EwcmFtMTBvcHkifQ.1H94oZk7CFKj8Bi7YESJwg';

  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-98.5795, 39.8283],
    zoom: 4
  });
  
  map.addControl(new mapboxgl.NavigationControl());
  
  updateMarkers(parksData);
  return map;
}

function updateMarkers(parks) {
  parkMarkers.forEach(marker => marker.remove());
  parkMarkers = [];
  
  parks.forEach(park => {
    if (park.latitude && park.longitude) {
      
      let activities = 'No activities listed';
      if (park.activities && park.activities.length > 0) {
        const activityList = park.activities.slice(0, 10).map(activity => activity.name);
        activities = activityList.join(', ');
        
        if (park.activities.length > 10) {
          activities += ` and more`;
        }
      } 
      
      const marker = new mapboxgl.Marker({
        color: '#C68C53'
      })
        .setLngLat([park.longitude, park.latitude])
        .setPopup(
          new mapboxgl.Popup({ 
            offset: 25,
            maxWidth: '450px'
          })
            .setHTML(`
              <div class="park-popup">
                ${park.images && park.images.length > 0 ? `
                  <img src="${park.images[0].url}" alt="${park.images[0].altText || park.fullName}" class="park-image">
                ` : ''}
                <div class="park-content">
                 <h3>${park.fullName}</h3>
                 <a href="${park.url}" target="_blank" class="park-link">Visit website</a>
                 <div class="park-info">
                  <p><strong>State  </strong> ${park.states}</p>
                  <p><strong>Park Type  </strong> ${park.designation}</p>
                  <p><strong>Activities  </strong> ${activities}</p>
                </div>
              </div>
            </div>
          `)
        )
        .addTo(map);
     
      parkMarkers.push(marker);
    }
  });
}

function setupStateFilter(parksData) {
  const stateDropdown = document.getElementById('state-dropdown');
  const stateMenu = document.getElementById('state-menu');
  
  const states = new Set();
  console.log('First park data: ', parksData[0]);
  
  parksData.forEach(park => {
    if (park.states) {
      if (typeof park.states === 'string') {
        park.states.split(',').forEach(state => {
          const trimmedState = state.trim();
          if (trimmedState) {
            states.add(trimmedState);
          }
        });
      }
    }
  });
  
  stateMenu.innerHTML = '<div class="dropdown-item" data-value="">All States</div>';
  
  Array.from(states).sort().forEach(state => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.setAttribute('data-value', state);
    item.textContent = state;
    stateMenu.appendChild(item);
  });
  
  stateDropdown.addEventListener('click', () => {
    stateMenu.classList.toggle('active');
  });

  stateMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('dropdown-item')) {
      const selectedState = e.target.getAttribute('data-value');
      
      const dropdownText = stateDropdown.querySelector('span');
      if (selectedState === '') {
        dropdownText.textContent = 'State';
        stateDropdown.classList.remove('active');
      } else {
        dropdownText.textContent = `State (${selectedState})`;
        stateDropdown.classList.add('active');
      }
      
      document.querySelectorAll('#state-menu .dropdown-item').forEach(item => {
        item.classList.remove('selected');
      });
      e.target.classList.add('selected');
      filterParksByState(selectedState);
      stateMenu.classList.remove('active');
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!stateDropdown.contains(e.target)) {
      stateMenu.classList.remove('active');
    }
  });
}

function setupActivityFilter(parksData) {
  const activityDropdown = document.getElementById('activity-dropdown');
  const activityMenu = document.getElementById('activity-menu');
  
  const activities = new Map();
  
  parksData.forEach(park => {
    if (park.activities && Array.isArray(park.activities)) {
      park.activities.forEach(activity => {
        if (activity.id && activity.name) {
          activities.set(activity.id, activity.name);
        }
      });
    }
  });
  
  activityMenu.innerHTML = '';
  
  const sortedActivities = Array.from(activities.entries())
    .sort((a, b) => a[1].localeCompare(b[1]));
  
  sortedActivities.forEach(([id, name]) => {
    const container = document.createElement('div');
    container.className = 'checkbox-container';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `activity-${id}`;
    checkbox.value = id;
    checkbox.dataset.name = name;
    
    const label = document.createElement('label');
    label.htmlFor = `activity-${id}`;
    label.textContent = name;
    
    container.appendChild(checkbox);
    container.appendChild(label);
    activityMenu.appendChild(container);
  });
  
  activityMenu.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      filterParksByActivities();
      
      const checkedBoxes = document.querySelectorAll('#activity-menu input[type="checkbox"]:checked');
      const dropdownText = activityDropdown.querySelector('span');
      
      if (checkedBoxes.length > 0) {
        dropdownText.textContent = `Activities (${checkedBoxes.length})`;
        activityDropdown.classList.add('active');
      } else {
        dropdownText.textContent = 'Activities';
        activityDropdown.classList.remove('active');
      }
    }
  });
  
  activityDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    activityMenu.classList.toggle('active');
    
    const stateMenu = document.getElementById('state-menu');
    if (stateMenu) {
      stateMenu.classList.remove('active');
    }
  });
  
  activityMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  document.addEventListener('click', (e) => {
    if (!activityDropdown.contains(e.target)) {
      activityMenu.classList.remove('active');
    }
  });
}


// Function: State
function filterParksByState(state) {
  applyAllFilters();
}


// Function: Activities
function filterParksByActivities() {
  applyAllFilters();
}


// Function: multiple filters
function applyAllFilters() {
  let filteredParks = parksData;
  
  // 1. by states
  const stateDropdown = document.getElementById('state-dropdown');
  const selectedStateElement = stateDropdown.querySelector('.dropdown-item.selected');
  if (selectedStateElement) {
    const selectedState = selectedStateElement.getAttribute('data-value');
    if (selectedState) {
      filteredParks = filteredParks.filter(park => {
        if (park.states) {
          const parkStates = park.states.split(',').map(s => s.trim());
          return parkStates.includes(selectedState);
        }
        return false;
      });
    }
  }
  
  // 2. by activities
  const checkedBoxes = document.querySelectorAll('#activity-menu input[type="checkbox"]:checked');
  if (checkedBoxes.length > 0) {
    const selectedActivities = [];
    checkedBoxes.forEach(checkbox => {
      selectedActivities.push({
        id: checkbox.value,
        name: checkbox.dataset.name
      });
    });
    
    filteredParks = filteredParks.filter(park => {
      if (!park.activities || !Array.isArray(park.activities)) {
        return false;
      }
      
      return park.activities.some(parkActivity => 
        selectedActivities.some(selectedActivity => 
          selectedActivity.id === parkActivity.id
        )
      );
    });
  }
  
  updateMarkers(filteredParks);
}
  
// Function: Themes
function setupThemeButtons() {
  const themeButtons = document.querySelectorAll('.theme-button');
  const activityDropdown = document.getElementById('activity-dropdown');
  
  const themeActivities = {
    'program and tours': [
      'Junior Ranger Program',
      'Guided Tours',
      'Self-Guided Tours - Walking', 
      'Self-Guided Tours - Auto',
      'Bus/Shuttle Guided Tour',
      'Boat Tour'
    ],
    'wildlife watching': [
      'Wildlife Watching',
      'Birdwatching'
    ],
    'camping': []
  };

  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const theme = button.dataset.activity;
      const isCurrentlyActive = button.classList.contains('active');
      
      themeButtons.forEach(btn => btn.classList.remove('active'));
      
      if (!isCurrentlyActive) {
        button.classList.add('active');
      
        const allCheckboxes = document.querySelectorAll('#activity-menu input[type="checkbox"]');
      
        if (theme === 'camping') {
          allCheckboxes.forEach(checkbox => {
            const activityName = checkbox.dataset.name.toLowerCase();
            if (activityName.includes('camping')) {
              checkbox.checked = true;
            }
          });
        } else if (themeActivities[theme]) {
          allCheckboxes.forEach(checkbox => {
            const activityName = checkbox.dataset.name;

            if (themeActivities[theme].some(themeActivity =>
              themeActivity.toLowerCase() === activityName.toLowerCase())) {
              checkbox.checked = true;
            }
          });
        }
      } else {
        const allCheckboxes = document.querySelectorAll('#activity-menu input[type="checkbox"]');
        
        if (theme === 'camping') {
          allCheckboxes.forEach(checkbox => {
            const activityName = checkbox.dataset.name.toLowerCase();
            if (activityName.includes('camping')) {
              checkbox.checked = false;
            }
          });
        } else if (themeActivities[theme]) {
          allCheckboxes.forEach(checkbox => {
            const activityName = checkbox.dataset.name;
            if (themeActivities[theme].includes(activityName)) {
              checkbox.checked = false;
            }
          });
        }
      }
      
      const checkedBoxes = document.querySelectorAll('#activity-menu input[type="checkbox"]:checked');
      const dropdownText = activityDropdown.querySelector('span');
      
      if (checkedBoxes.length > 0) {
        dropdownText.textContent = `Activities (${checkedBoxes.length})`;
        activityDropdown.classList.add('active');
      } else {
        dropdownText.textContent = 'Activities';
        activityDropdown.classList.remove('active');
      }
      
      applyAllFilters();
    });
  });
                       
  const activityMenu = document.getElementById('activity-menu');
  activityMenu.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox'){
      themeButtons.forEach(btn => btn.classList.remove('active'));
    }
  });
}

async function mainEvent() {
  console.log("Loaded script.js");
  
  // NPS API
  const baseurl = "https://developer.nps.gov/api/v1";
  const apiKey = "4U03ywTq5WpqhGMSK6t5otQadjMxr2paWAgJlF26";
  const endpoint = "parks";
  const npsUrl = "https://developer.nps.gov/api/v1/parks?api_key=4U03ywTq5WpqhGMSK6t5otQadjMxr2paWAgJlF26&limit=50";
  
  try {
    const results = await fetch(npsUrl);
    const npsData = await results.json();
    console.log(npsData);
    
    if (!npsData || !npsData.data) {
      console.error("Invalid data format from API");
      return;
    }
    
    parksData = npsData.data;
    
    map = initializeMap(parksData);
    setupStateFilter(parksData);
    setupActivityFilter(parksData);
    setupThemeButtons();
    
    document.querySelector('.logo').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.reload();
    });
    
  } catch (error) {
    console.error("Error in mainEvent:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => mainEvent());