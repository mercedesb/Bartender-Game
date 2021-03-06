import React, { Component } from "react";
import * as THREE from 'three'
import DrinkCard from "../../components/DrinkCard";
import Canvas from "../../components/Canvas";
import { Row, Grid } from "react-bootstrap";
import { Button, Modal } from 'react-bootstrap';
import CocktailAPI from "../../utils/CocktailAPI.js";
import DBAPI from "../../utils/DBAPI.js";
import './Bar.css';

// MB: One overarching piece of feedback I have is that it feels like the page components are doing too much that they don't
// need to and passing functions around as props to a single child component
// If a function is only used by one component, let's move it into that component to more fully encapsulate the logic
// and so that the child components are more reusable if/when this app grows

// MB: we could refactor the messages constant into an object so that it's more easily understandable what the purpose of each message is
// ex: const messages = {
//  welcome: "Welcome to the bar!...",
//  lose: "Proportions are off...",
//  win: "Nice Pour!..."
// }
const messages = ["Welcome to the bar! Time to learn some drinks. Hold down buttons 1-4 on the keyboard to pour the various ingredients in the prescribed amounts. Be careful not to overfill your drink!\n\nNote that only primary pourable ingredients are included for each drink.",
  "Proportions are off...Let's try again.", "Nice Pour! Let's mix another."]

class Bar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedUser: this.props.loggedUser,
      lastDrinkData: {},
      currentDrinkData: {},
      ingredients: [],
      keysPressed: [false, false, false, false],
      counters: [0, 0, 0, 0],
      // MB: Could we do something for drink status similar to messages to make more clear what the statuses are
      // and to remove some of the magic numbers from your component logic?
      drinkStatus: [], //0 = not filled, 1 = good fill, 2 = overfilled
      timer: 0,
      modalShow: true,
      modalMessage: 0, //0 is welcome, 1 is lose, 2 is win
      animating: false,
    };
  }
  /**
  * resets all game state variables and calls another cocktail fetch
  * 
  * @returns void
  */
  reset = () => {
    this.setState({ counters: [0, 0, 0, 0], drinkStatus: [], lastDrinkData: this.state.currentDrinkData }, function () {
      this.getCocktail();
    });
  }

  /**
  * changes the modal show state to false
  * 
  * @returns void
  */
  handleClose = () => {
    this.setState({ modalShow: false });
  }

  /**
  * based on status received, returns a different color
  *
  * @param {number} that determines color
  * 
  * @returns {string} color
  */
 
 // MB: since this function is only used in the DrinkCard component, we can move it there to more fully encapsulate
 // the DrinkCard logic
  getColor = (status) => {
    if (status === 0) {
      return "blue";
    }
    else if (status === 1) {
      return "green";
    }
    else if (status === 2) {
      return "red";
    }
  }

  /**
  * when 1-4 are pressed, toggles booleans in an array to reflect which buttons are pressed
  *
  * @param {event} that determines which keys are pressed
  * 
  * @returns void
  */
  toggleKeys = e => {
    let key = e.key;
    if (key > 0 && key < 5) {
      let copyPress = [...this.state.keysPressed];
      copyPress[key - 1] = e.type === 'keydown';
      this.setState({ keysPressed: copyPress });
      if (this.state.keysPressed.every(function (i) { return !i; })
        && this.state.drinkStatus.some(function (i) { return i === 2; })) {

        // MB: building off my one of the first comments in this file regarding the messages constant: 
        // If we have messages defined as an object, we can then update the modalMessages as modalMessage: messages.lose
        this.setState({ modalShow: true, modalMessage: 1 });
        this.reset();
      }
      else if (this.state.keysPressed.every(function (i) { return !i; })
        && this.state.drinkStatus.every(function (i) { return i === 1; })) {
        this.setState({ modalShow: true, modalMessage: 2 });
        const letter = { drinkData: this.state.currentDrinkData, drinkIngredients: this.state.ingredients }
        DBAPI.updateMastery(this.state.loggedUser, letter);
        this.reset();
      }
    };
  }

  /**
  * sets the Three.js stage for animation
  * 
  * @returns void
  */
  setStage = () => {
    var THREE = require('three');
    /* Sets up scene */
    let renderer;
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("barCanvas"), alpha: true, antialias: true });
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);

    var scene = new THREE.Scene();

    var light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);

    var light1 = new THREE.PointLight(0xffffff, 0.5);
    scene.add(light1);

    //setup arrays for visual elements in each scene
    var meshArr1 = [];
    var meshArr2 = [];
    var meshArr3 = [];
    var meshArr4 = [];
    var geometryArr1 = [];
    var geometryArr2 = [];
    var geometryArr3 = [];
    var geometryArr4 = [];

    var meshArrs = [meshArr1, meshArr2, meshArr3, meshArr4];
    var geometryArrs = [geometryArr1, geometryArr2, geometryArr3, geometryArr4];

    //Scene 1 visual elements
    var geometry = new THREE.IcosahedronGeometry(2000);
    var normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    var planeGeometry = new THREE.PlaneGeometry(6000, 6000, 50, 50);
    geometryArr1.push(geometry, planeGeometry);

    var material = new THREE.MeshStandardMaterial({ color: 0xa200ff, wireframe: true, side: THREE.DoubleSide });
    var normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    var shape = new THREE.Mesh(geometry, normalMaterial);
    var plane = new THREE.Mesh(planeGeometry, material);
    meshArr1.push(shape, plane);
    plane.position.set(0, -150, 0);
    shape.position.set(0, 0, 0);
    plane.rotation.x += -Math.PI / 2;

    scene.add(plane, shape);
  }

  /**
  * function that counts values for drink pouring while buttons are pressed
  * also calls animation frames to reflect this number change
  * 
  * @returns void
  */
  count = () => {
    let copyCount = [...this.state.counters];
    let copyStatus = [...this.state.drinkStatus];
    this.state.keysPressed.forEach((e, i) => {
      if (e) {
        copyCount[i] += .01;
        this.setState({ counters: copyCount });
      }
      if (i < this.state.ingredients.length) {
        if (this.state.counters[i] >= parseFloat(this.state.ingredients[i].measurement) - .1) {
          //set color green
          copyStatus[i] = 1;
          this.setState({ drinkStatus: copyStatus });
        }
        if (this.state.counters[i] >= parseFloat(this.state.ingredients[i].measurement) + .1) {
          //set color red
          copyStatus[i] = 2;
          this.setState({ drinkStatus: copyStatus });
        }
      }
    })
    requestAnimationFrame(this.count);
  }

  /**
  * when passed a value with a dash, finds the average of the two numbers
  *
  * @param {string} of two numbers seperated by a dash
  * 
  * @returns {number} of averaged numbers
  */
  getAvg = (strDash) => {
    let values = strDash.split("-");
    return (parseFloat(values[0]) + parseFloat(values[1])) / 2;
  }

  /**
  * converts all measurements passed to it to ounces
  *
  * @param {string} of measurement with units
  * 
  * @returns {number} of coverted measurement
  */
  toOunce = (strMeasure) => {
    let parseArr = strMeasure.split(" ");
    let result = 0;
    parseArr.forEach((e, i) => {
      if ((e.toLowerCase() === "oz" || e.toLowerCase() === "cl" || e.toLowerCase() === "tbsp" || e.toLowerCase() === "tsp") && i !== parseArr.length - 1) {
        parseArr.splice(i + 1, parseArr.length - (i + 1));
      }
    })
    let measure = parseArr.pop();
    for (let i = 0; i < parseArr.length; i++) {
      if (parseArr[i].includes("-")) {
        parseArr.splice(i, 1, this.getAvg(parseArr[i]));
      }
      result += eval(parseArr[i]);
    }
    if (measure.toLowerCase() === "cl") {
      return result * (3 / 10);
    }
    if (measure.toLowerCase() === "tbsp") {
      return result / 2;
    }
    if (measure.toLowerCase() === "tsp") {
      return result / 6;
    }
    return result;
  }

  /**
  * adds listeners for keypresses and removes old ones
  * 
  * @returns void
  */
  addListeners = () => {
    document.removeEventListener("keydown", this.toggleKeys);
    document.removeEventListener("keyup", this.toggleKeys);
    document.addEventListener("keydown", this.toggleKeys);
    document.addEventListener("keyup", this.toggleKeys);
  }

  /**
  * function gets a random classic cocktail from cocktaildb and returns the json object
  * the function continues to grab primary ingredients from the cocktail and parse all values into ounces
  * 
  * @returns a login form to the page
  */
 
 // MB: There are multiple calls to setState within the same code block. We should try to limit our calls to setState, 
 // otherwise we are re-rendering multiple times in a single block and often that's unnecessary (especially since this is
 // being called in componentDidMount and updating state here can already sometimes cause performance issues: 
 // https://reactjs.org/docs/react-component.html#componentdidmount)
 // 
 // Something like the following could be one way to achieve this
 // 
 // getCocktail = () => {
  //   CocktailAPI.getClassic()
  //     .then(res => {
  //       let validIngredients = [];
  //       let validMeasurements = [];
  //       let validComponents = [];
  //       const currentDrinkData = res.data.drinks[0];
  //       
  //       ... code removed for brevity
  //       const ingredients = validComponents;
  //       this.setState({ 
  //          currentDrinkData,
  //          ingredients
  //       });
  //     })
  //     .then(res => {
  //       ... code removed for brevity
  
  getCocktail = () => {
    CocktailAPI.getClassic()
      .then(res => {
        let validIngredients = [];
        let validMeasurements = [];
        let validComponents = [];
        this.setState({ currentDrinkData: res.data.drinks[0] });
        for (let k in res.data.drinks[0]) {
          if (k.includes("Ingredient") && res.data.drinks[0][k]) {
            validIngredients.push(res.data.drinks[0][k].trim());
          }
          if (k.includes("Measure") && res.data.drinks[0][k]) {
            validMeasurements.push(res.data.drinks[0][k].trim());
          }
        }
        validMeasurements.forEach((e, i) => {
          if (e.toLowerCase().includes("oz") || e.toLowerCase().includes("cl") || e.toLowerCase().includes("tbsp")) {
            const parsedMeasure = this.toOunce(e).toFixed(2);
            validComponents.push({ ingredient: validIngredients[i], measurement: parsedMeasure });
            // MB: Even though drinkStatus is an array and this is technically valid, this doesn't mutate the state
            // which I believe is what we want. We can clone the current drink status, push the new status onto the clone, and
            // and then set the state of drinkStatus to the clone to prevent any odd, unforseen bugs pop up in the future
            this.state.drinkStatus.push(0);
          }
        });
        this.setState({ ingredients: validComponents });
      })
      .then(res => {
        if (!this.state.animating) {
          requestAnimationFrame(this.count);
          this.setState({ animating: true });
        }
      })
      .catch(err => console.log(err));
  }

  /**
  * on component mount, adds listeners, gets a cocktail, and sets the stage
  * 
  * @returns void
  */
  componentDidMount() {
    this.getCocktail();
    this.addListeners();
    this.setStage();
  }

  render() {
    return (
      <div>
        <Modal show={this.state.modalShow} onHide={this.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>StirUp</Modal.Title>
          </Modal.Header>
          <Modal.Body className="subtitle">
            <h4>{messages[this.state.modalMessage]}</h4>
            {this.state.modalMessage === 2 ? <div><hr /><h5>{this.state.lastDrinkData.strDrink} Mixing Instructions</h5><p>{this.state.lastDrinkData.strInstructions}</p></div> :
              null}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.handleClose}>Close</Button>
          </Modal.Footer>
        </Modal>
        <Grid fluid>
          <Row>
            <div className="stage">
              <DrinkCard
                name={this.state.currentDrinkData.strDrink}
                ingredients={this.state.ingredients}
                counter={this.state.counters}
                status={this.state.drinkStatus}
                getColor={this.getColor} />
              <Canvas />
            </div>
          </Row>
        </Grid>
      </div>
    );
  }
}

export default Bar;