export default class ThisMove {
  private _fromBarIdx: number | string;
  private _toBarIdx: number;
  private _canGoTo: number[];
  private _canSelectOutBar: boolean;
  private _canBearOff: boolean;

  constructor() {
    this._fromBarIdx = -1;
    this._toBarIdx = -1;
    this._canGoTo = [];
    this._canSelectOutBar = false;
    this._canBearOff = false;
  }

  public static new = () => new ThisMove();

  public get fromBarIdx() {
    return this._fromBarIdx;
  }
  public set fromBarIdx(value) {
    this._fromBarIdx = value;
  }
  public get toBarIdx() {
    return this._toBarIdx;
  }
  public set toBarIdx(value) {
    this._toBarIdx = value;
  }
  public get canGoTo() {
    return this._canGoTo;
  }
  public set canGoTo(value) {
    this._canGoTo = value;
  }
  public get canSelectOutBar() {
    return this._canSelectOutBar;
  }
  public set canSelectOutBar(value) {
    this._canSelectOutBar = value;
  }
  public get canBearOff() {
    return this._canBearOff;
  }
  public set canBearOff(value) {
    this._canBearOff = value;
  }

  public clone() {
    const newThisMove = new ThisMove();
    newThisMove.fromBarIdx = this._fromBarIdx;
    newThisMove.toBarIdx = this._toBarIdx;
    newThisMove.canGoTo = [...this._canGoTo];
    newThisMove.canSelectOutBar = this._canSelectOutBar;
    newThisMove.canBearOff = this._canBearOff;

    return newThisMove;
  }
}
