import {
  IRoute,
  ITransferPoint,
  ITransitRoute,
  TransitType,
} from "@/typescript/models/routes";
import { StopModelHelper } from "./stops";
import { Feature, Point, point } from "@turf/helpers";
import { IStop } from "@/typescript/models/stops";
import { createLineSlice, createLineString } from ".";
import length from "@turf/length";
import { DistanceUnits } from "../validations";
import { ICoordinates } from "@/typescript/models";
import { intersection, omit } from "lodash-es";

export class RouteModelHelper {
  private from!: number;
  private to!: number;
  private startPoint!: Feature<Point, IStop>;
  private endPoint!: Feature<Point, IStop>;
  private visitedRoute = new Set<IRoute>();

  public _transitRoutes: ITransitRoute[] = [];
  private transferPoints: ITransferPoint[] = [];

  constructor(
    private stops: IStop[],
    private routes: IRoute[],
    private userPosition: ICoordinates | null,
    private count: number,
    private distanceUnit: DistanceUnits
  ) {
    this.transferPoints = this.findTransferPoints();
  }

  get transitRoutes() {
    return RouteModelHelper.sortTransitRoutes(this._transitRoutes).slice(
      0,
      this.count
    );
  }

  public updateFromRoute(from: number) {
    this.from = from;
  }

  public updateToRoute(to: number) {
    this.to = to;
  }

  public updateStartPoint(startPoint: Feature<Point, IStop>) {
    this.startPoint = startPoint;
  }

  public updateEndPoint(endPoint: Feature<Point, IStop>) {
    this.endPoint = endPoint;
  }

  /**
   * Finds and returns an array of transfer points.
   *
   * @return {ITransferPoint[]} An array of transfer points.
   */
  private findTransferPoints(): ITransferPoint[] {
    const transferPoints: ITransferPoint[] = [];
    const routesByStop: { [stop: number]: IRoute[] } = {};

    for (const route of this.routes) {
      for (const stop of route.stops) {
        routesByStop[stop] = routesByStop[stop] || [];
        routesByStop[stop].push(route);

        if (routesByStop[stop].length > 1) {
          transferPoints.push({ stop, routes: routesByStop[stop] });
        }
      }
    }

    return transferPoints;
  }

  /**
   * Finds transit routes based on the given options.
   *
   * @param {ITransitRouteOptions} options - The options for finding transit routes.
   * @param {number} options.count - The maximum number of transit routes to return.
   * @return {ITransitRoute[]} An array of transit routes.
   */
  public findTransitRoutes(): void {
    if (!this.from || !this.to || !this.startPoint || !this.endPoint) {
      // Invalid route parameters
      return;
    }

    const fromTransferPoint = this.transferPoints.find(
      (ftp) => ftp.stop === this.from
    );

    const toTransferPoint = this.transferPoints.find(
      (ttp) => ttp.stop === this.to
    );

    if (!fromTransferPoint || !toTransferPoint) {
      // stop cannot be found
      return;
    }

    const isRequiredToReverse = StopModelHelper.isRequiredToReverseStops(
      this.from
    );

    fromLoop: for (const fromRoute of fromTransferPoint.routes) {
      const fromRouteLineString = createLineString(
        fromRoute.coordinates,
        fromRoute.route_id
      );

      // direct route check
      if (intersection(fromRoute.stops, [this.from, this.to]).length === 2) {
        // push found route to visitedRoute
        if (!this.visitedRoute.has(fromRoute)) {
          this.visitedRoute.add(fromRoute);
        }

        const routeStopsSlice = StopModelHelper.findInBetweenStops(
          this.from,
          this.to,
          fromRoute.stops
        );

        const routeLineSlice = createLineSlice(
          this.startPoint,
          this.endPoint,
          fromRouteLineString
        );

        const routeLength = length(routeLineSlice, {
          units: this.distanceUnit,
        });

        this._transitRoutes.push({
          id: fromRoute.route_id,
          routes: [
            {
              ...fromRoute,
              stops: routeStopsSlice,
              coordinates:
                routeLineSlice.geometry.coordinates.map<ICoordinates>(
                  ([lng, lat]) => ({
                    lng,
                    lat,
                  })
                ),
            },
          ],
          transitSteps: [
            {
              type: TransitType.TRANSIT,
              step: omit(fromRoute, ["stops", "coordinates"]),
              distance: routeLength,
            },
          ],

          distance: routeLength,
        });
      }

      // break the loop if the maximum number of routes is reached
      if (this._transitRoutes.length >= this.count) {
        return;
      }

      for (const toRoute of toTransferPoint.routes) {
        const toRouteLineString = createLineString(
          toRoute.coordinates,
          toRoute.route_id
        );

        const commonStops = fromRoute.stops.filter((fsid) =>
          toRoute.stops.includes(fsid)
        );

        // 2 transits
        if (commonStops.length > 0) {
          const routeId = `${fromRoute.route_id} - ${toRoute.route_id}`;

          // check previous existing transits
          if (this.visitedRoute.has(fromRoute)) {
            continue fromLoop;
          }

          // check previous existing transits
          if (!this._transitRoutes.some((tr) => tr.id === routeId)) {
            const commonStop = this.stops.find((stop) => {
              const commonStopId = commonStops.at(isRequiredToReverse ? -1 : 0);

              // check if common stop is equal with the dest stop
              if (commonStopId !== this.to) {
                return stop.id === commonStopId;
              }

              return stop.id === commonStops.at(isRequiredToReverse ? -1 : 0);
            }) as IStop;

            if (!this.visitedRoute.has(fromRoute)) {
              this.visitedRoute.add(fromRoute);
            }

            // find in-between stops
            const fromStopRouteSlice = StopModelHelper.findInBetweenStops(
              this.from,
              commonStop.id,
              fromRoute.stops
            );

            const toStopRouteSlice = StopModelHelper.findInBetweenStops(
              commonStop.id,
              this.to,
              toRoute.stops
            );

            // commonStop point to make slice line string
            const commonStopPoint = point([commonStop.lng, commonStop.lat]);

            const fromRouteLineSlice = createLineSlice(
              this.startPoint,
              commonStopPoint,
              fromRouteLineString,
              routeId
            );

            const toRouteLineSlice = createLineSlice(
              commonStopPoint,
              this.endPoint,
              toRouteLineString,
              routeId
            );

            // calculate sliced line string length
            const fromRouteLength = length(fromRouteLineSlice, {
              units: this.distanceUnit,
            });

            const toRouteLength = length(toRouteLineSlice, {
              units: this.distanceUnit,
            });

            // push to array
            this._transitRoutes.push({
              id: routeId,
              routes: [
                {
                  ...fromRoute,
                  stops: fromStopRouteSlice,
                  coordinates: fromRouteLineSlice.geometry.coordinates.map(
                    ([lng, lat]) => ({
                      lng,
                      lat,
                    })
                  ),
                },
                {
                  ...toRoute,
                  stops: toStopRouteSlice,
                  coordinates: toRouteLineSlice.geometry.coordinates.map(
                    ([lng, lat]) => ({
                      lng,
                      lat,
                    })
                  ),
                },
              ],
              transitSteps: [
                {
                  type: TransitType.TRANSIT,
                  step: omit(fromRoute, ["stops", "coordinates"]),
                  distance: fromRouteLength,
                },
                {
                  type: TransitType.TRANSIT,
                  step: omit(toRoute, ["stops", "coordinates"]),
                  distance: toRouteLength,
                },
              ],

              distance: fromRouteLength + toRouteLength,
            });
          }
        }
      }
    }

    if (this._transitRoutes.length >= this.count) {
      return;
    }

    for (const fromRoute of fromTransferPoint.routes) {
      const fromRouteLineString = createLineString(
        fromRoute.coordinates,
        fromRoute.route_id
      );

      for (const toRoute of toTransferPoint.routes) {
        const toRouteLineString = createLineString(
          toRoute.coordinates,
          toRoute.route_id
        );

        // 3 transits
        joinRoute: for (const joinRoute of this.routes) {
          // skip if join route is same as from and to route
          if (
            joinRoute.route_id === fromRoute.route_id ||
            joinRoute.route_id === toRoute.route_id ||
            this.visitedRoute.has(joinRoute)
          ) {
            continue;
          }

          // check if can join
          const joinStartCommonStops = fromRoute.stops.filter((fsid) =>
            joinRoute.stops.includes(fsid)
          );
          const joinEndCommonStops = toRoute.stops.filter((tsid) =>
            joinRoute.stops.includes(tsid)
          );

          // check if there is common stops
          if (
            joinStartCommonStops.length === 0 ||
            joinEndCommonStops.length === 0
          ) {
            continue joinRoute;
          }

          const routeId = `${fromRoute.route_id} - ${joinRoute.route_id} - ${toRoute.route_id}`;

          const commonStartStop = this.stops.find(
            (stop) =>
              stop.id === joinStartCommonStops.at(isRequiredToReverse ? -1 : 0)
          ) as IStop;

          const commonEndStop = this.stops.find(
            (stop) =>
              stop.id === joinEndCommonStops.at(isRequiredToReverse ? -1 : 0)
          ) as IStop;

          const fromStopRouteSlice = StopModelHelper.findInBetweenStops(
            this.from,
            commonStartStop.id,
            fromRoute.stops
          );

          const joinStopRouteSlice = StopModelHelper.findInBetweenStops(
            commonStartStop.id,
            commonEndStop.id,
            joinRoute.stops
          );

          const toStopRouteSlice = StopModelHelper.findInBetweenStops(
            commonEndStop.id,
            this.to,
            toRoute.stops
          );

          // geojson
          const commonStartStopPoint = point([
            commonStartStop.lng,
            commonStartStop.lat,
          ]);
          const commonEndStopPoint = point([
            commonEndStop.lng,
            commonEndStop.lat,
          ]);

          const joinRouteLineString = createLineString(
            joinRoute.coordinates,
            joinRoute.route_id
          );

          const fromRouteLineSlice = createLineSlice(
            this.startPoint,
            commonStartStopPoint,
            fromRouteLineString,
            routeId
          );

          const joinRouteLineSlice = createLineSlice(
            commonStartStopPoint,
            commonEndStopPoint,
            joinRouteLineString,
            routeId
          );

          const toRouteLineSlice = createLineSlice(
            commonEndStopPoint,
            this.endPoint,
            toRouteLineString,
            routeId
          );

          const fromRouteLength = length(fromRouteLineSlice, {
            units: this.distanceUnit,
          });

          const joinRouteLength = length(joinRouteLineSlice, {
            units: this.distanceUnit,
          });

          const toRouteLength = length(toRouteLineSlice, {
            units: this.distanceUnit,
          });

          // push to array
          this._transitRoutes.push({
            id: routeId,
            routes: [
              {
                ...fromRoute,
                stops: fromStopRouteSlice,
                coordinates: fromRouteLineSlice.geometry.coordinates.map(
                  ([lng, lat]) => ({
                    lng,
                    lat,
                  })
                ),
              },
              {
                ...joinRoute,
                stops: joinStopRouteSlice,
                coordinates: joinRouteLineSlice.geometry.coordinates.map(
                  ([lng, lat]) => ({
                    lng,
                    lat,
                  })
                ),
              },
              {
                ...toRoute,
                stops: toStopRouteSlice,
                coordinates: toRouteLineSlice.geometry.coordinates.map(
                  ([lng, lat]) => ({
                    lng,
                    lat,
                  })
                ),
              },
            ],
            transitSteps: [
              {
                type: TransitType.TRANSIT,
                step: omit(fromRoute, ["stops", "coordinates"]),
                distance: fromRouteLength,
              },
              {
                type: TransitType.TRANSIT,
                step: omit(joinRoute, ["stops", "coordinates"]),
                distance: joinRouteLength,
              },
              {
                type: TransitType.TRANSIT,
                step: omit(toRoute, ["stops", "coordinates"]),
                distance: toRouteLength,
              },
            ],
            distance: fromRouteLength + joinRouteLength + toRouteLength,
          });
        }
      }
    }
  }

  public static sortTransitRoutes(routes: ITransitRoute[]): ITransitRoute[] {
    return routes.sort((prev, next) => {
      // prioritize the routes with fewer transit steps
      if (prev.transitSteps.length < next.transitSteps.length) {
        return -1;
      } else if (prev.transitSteps.length > next.transitSteps.length) {
        return 1;
      } else {
        // if transit steps are equal, prioritize by distance
        if (prev.distance < next.distance) {
          return -1;
        } else if (prev.distance > next.distance) {
          return 1;
        } else {
          return 0;
        }
      }
    });
  }
}
