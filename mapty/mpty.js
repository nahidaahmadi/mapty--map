"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

//creating the workout class
class Workout {
  clicks = 0;
  //out of construction-fields
  date = new Date();
  //cutting edge js--to get a unique id---kinda
  id = (Date.now() + "").slice(-10); //gets 10 last digit of today's date like an string!

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance;
    this.duration = duration;
  }
  click() {
    this.clicks++;
  }

  _setDescription() {
    //prettier-ignore
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/h;
    return this.speed;
  }
}
/*  ids are gonna be different as u cant click two places at the same time
const run1 = new Running([39, -12], 5.2, 24, 178);
const cycle1 = new Cycling([39, -12], 27, 95, 523);
console.log(run1);
console.log(cycle1);*/
//////////////////////////////////////////////////////////////////////////////////////////////
//APLLİCATİON ARCHİTICTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    this._getPosition(); //location is taken as soon as an object is created

    //get local storage
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this)); //this keyword on an event handler points to the form not the object,so use bind
    inputType.addEventListener("change", this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener("click", this._movetopopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        //the postion will be passed automatically as soon as its loaded no need
        this._loadMap.bind(this), //it is regular function call not treated as a method so this=undefined--use bind
        function () {
          alert("Couldn't get your location");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    //copied from leaflet--l here is like intl.
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel); //map is created here--coordinates,zoom(arttıkça daha yakın gösterir)

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this)); //this=app object
    //load the workouts on the map
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDuration.value =
      inputElevation.value =
      inputDistance.value =
        "";
    form.style.display = "none"; //to remove the smoothness here  due to transition
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000); //add it back after the transition is finished
  }

  _toggleElevationField() {
    //one of them are gonna always be hidden--cycling and running!
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInput = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp)); //returns true if all are true and false if one is false
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let workout;
    //if activity is running,create a running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        /*
        !Number.isFinite(duration)||
        !Number.isFinite(distance)||
        !Number.isFinite(cadence)*/

        !validInput(duration, cadence, distance) ||
        !allPositive(duration, distance, cadence)
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Running(coords, distance, duration, cadence);
    }
    //if activity is cycling,create a cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInput(
          duration,
          distance,
          elevation || !allPositive(duration, distance)
        )
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Cycling(coords, distance, duration, elevation);
    }
    //console.log(workout);
    //add new object to workout array
    this.#workouts.push(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout); //we call it ourself and on this keyword then no need for bind method
    this._renderWorkoutList(workout);
    //hide form +clear input fields
    this._hideForm();
    //local storage--API
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //the popup thing on a clicked location on the map
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          className: `${workout.type}-popup`,
          autoClose: false, //it shouldnt be closed when clicked on another point
          closeOnClick: false,
        }).setContent(
          `${workout.type === "running" ? "🏃" : "🚴‍♀️"} ${workout.description}`
        )
      )
      .openPopup();
  }

  //render workout on list

  _renderWorkoutList(workout) {
    let html = `
    <li class="workout workout--running" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === "running") {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
      if (workout.type === "cycling") {
        html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li> -->
    `;
      }
    }
    form.insertAdjacentHTML("afterend", html); //add this as sibling after the end of first one
  }

  _movetopopup(e) {
    const workEl = e.target.closest(".workout"); //when clicked on details of workout move to that location on the map
    // console.log(workEl);
    if (!workEl) return;
    const workout = this.#workouts.find((el) => el.id === workEl.dataset.id);
    //console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    }); //the method that helps us to move to a clicked workout on the map
    //3rd argument here makes the movement smooth!*

    //using the public interface
    //workout.click();after getting the data from the localStorage-the prototype chain is lost and the click method-beepppp
  }
  _setLocalStorage() {
    //the object is added to the local storage as string-make it visible to the page
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    //console.log(data);
    if (!data) return;
    //when loaded add the data to the workout array which is empty
    this.#workouts = data;
    this.#workouts.forEach((work) => this._renderWorkoutList(work));
    //if the this._renderWorkoutMarker here:it wont work cause the getLocalStorage is called
    //in the first step and the map is not even loaded or created yet
    //instead do it after the map is loaded
  }
  //reset the local storage
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

//create Objects
const app = new App(); //as soon as the object is created-the constructor is called
//app._getPosition(); the location of the object should be accessed in the first step--then instead of calling the method here just add it to the ocnstructor
