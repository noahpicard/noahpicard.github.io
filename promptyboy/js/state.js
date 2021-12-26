class State {
  objects = [];
  print() {
    this.objects.map((obj) => {
      console.log(obj.str());
    });
  }
  takeStep() {
    this.objects.map((obj) => {
      obj.beforeStep(this);
    });
    this.objects.map((obj) => {
      obj.step(this);
    });
  }
}