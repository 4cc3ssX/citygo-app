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

export interface ITransitRouteOptions {
  count: number;
}

export class RouteModelHelper {
  private possibleTransitRoutes: IRoute[] = [];
  private transferPoints: ITransferPoint[] = [];

  constructor(
    private stops: IStop[],
    private routes: IRoute[],
    private from: number,
    private to: number,
    private startPoint: Feature<Point, IStop>,
    private endPoint: Feature<Point, IStop>,
    private distanceUnit: DistanceUnits
  ) {
    this.transferPoints = this.findTransferPoints();
  }

  get possibleTransits() {
    return this.possibleTransitRoutes;
  }

  /**
   * Finds and returns an array of transfer points.
   *
   * @return {ITransferPoint[]} An array of transfer points.
   */
  public findTransferPoints(): ITransferPoint[] {
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
  public findTransitRoutes({
    count = 10,
  }: ITransitRouteOptions): ITransitRoute[] {
    const transitRoutes: ITransitRoute[] = [];
    const fromTransferPoint = this.transferPoints.find(
      (ftp) => ftp.stop === this.from
    );

    const toTransferPoint = this.transferPoints.find(
      (ttp) => ttp.stop === this.to
    );

    if (!fromTransferPoint || !toTransferPoint) {
      // stop cannot be found
      return [];
    }

    const visitedRoute = new Set<IRoute>();

    for (const fromRoute of fromTransferPoint.routes) {
      const isRequiredToReverse = StopModelHelper.isRequiredToReverseStops(
        this.from
      );

      const fromRouteLineString = createLineString(
        fromRoute.coordinates,
        fromRoute.route_id
      );

      // direct route check
      if (intersection(fromRoute.stops, [this.from, this.to]).length === 2) {
        // push found route to visitedRoute
        if (!visitedRoute.has(fromRoute)) {
          visitedRoute.add(fromRoute);
        }

        const routeLineSlice = createLineSlice(
          this.startPoint,
          this.endPoint,
          fromRouteLineString
        );

        const routeLength = length(routeLineSlice, {
          units: this.distanceUnit,
        });
        transitRoutes.push({
          id: fromRoute.route_id,
          route: [fromRoute],
          transitSteps: [
            {
              type: TransitType.TRANSIT,
              step: {
                id: fromRoute.route_id,
                color: fromRoute.color,
                stops: StopModelHelper.findInBetweenStops(
                  this.from,
                  this.to,
                  fromRoute.stops
                ),
              },
            },
          ],
          coordinates: routeLineSlice.geometry.coordinates.map<ICoordinates>(
            ([lng, lat]) => ({
              lng,
              lat,
            })
          ),
          distance: routeLength,
        });
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
          if (!transitRoutes.some((tr) => tr.id === routeId)) {
            // check if we have enough routes
            if (transitRoutes.length === count) {
              break;
            }

            const commonStop = this.stops.find((stop) => {
              const commonStop = commonStops.at(isRequiredToReverse ? -1 : 0);

              // check if common stop is equal with the dest top
              if (commonStop !== this.to) {
                return stop.id === commonStop;
              }

              return (
                stop.id ===
                commonStops.at(
                  isRequiredToReverse ? -1 : Math.floor(commonStops.length / 3)
                )
              );
            }) as IStop;

            // if commonStop is already visited by direct route, skip the loop
            if (
              Array.from(visitedRoute).some((vr) =>
                vr.stops.includes(commonStop.id)
              )
            ) {
              continue;
            }

            // push found route to visitedRoute
            if (!visitedRoute.has(toRoute)) {
              visitedRoute.add(toRoute);
            }

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

            // geojson
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

            const fromRouteLength = length(fromRouteLineSlice, {
              units: this.distanceUnit,
            });

            const toRouteLength = length(toRouteLineSlice, {
              units: this.distanceUnit,
            });

            // push to array
            transitRoutes.push({
              id: routeId,
              route: [
                omit(fromRoute, ["stops", "coordinates"]),
                omit(toRoute, ["stops", "coordinates"]),
              ],
              transitSteps: [
                {
                  type: TransitType.TRANSIT,
                  step: {
                    id: fromRoute.route_id,
                    color: fromRoute.color,
                    stops: fromStopRouteSlice,
                  },
                },
                {
                  type: TransitType.TRANSIT,
                  step: {
                    id: toRoute.route_id,
                    color: toRoute.color,
                    stops: toStopRouteSlice,
                  },
                },
              ],
              coordinates: [fromRouteLineSlice, toRouteLineSlice]
                .find((rf) => rf.id === routeId)
                ?.geometry.coordinates.map(([lng, lat]) => ({
                  lng,
                  lat,
                })) as ICoordinates[],
              distance: fromRouteLength + toRouteLength,
            });
          }
        }

        // 3 transits
        for (const joinRoute of this.routes) {
          // skip if join route is same as from and to route
          if (
            joinRoute.route_id === fromRoute.route_id ||
            joinRoute.route_id === toRoute.route_id ||
            visitedRoute.has(joinRoute)
          ) {
            continue;
          }

          const joinStartCommonStops: number[] = [];
          const joinEndCommonStops: number[] = [];

          const fromJoinStops = fromRoute.stops.filter((fsid) =>
            joinRoute.stops.includes(fsid)
          );
          const toJoinStops = toRoute.stops.filter((tsid) =>
            joinRoute.stops.includes(tsid)
          );

          // check if can join
          const canJoin = fromJoinStops.length > 0 && toJoinStops.length > 0;

          if (
            canJoin &&
            !joinStartCommonStops.some((jsid) => fromJoinStops.includes(jsid))
          ) {
            joinStartCommonStops.push(...fromJoinStops);
          }

          if (
            canJoin &&
            !joinEndCommonStops.some((jsid) => toJoinStops.includes(jsid))
          ) {
            joinEndCommonStops.push(...toJoinStops);
          }

          // check if there is common stop
          if (
            joinStartCommonStops.length === 0 ||
            joinEndCommonStops.length === 0
          ) {
            continue;
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
          transitRoutes.push({
            id: routeId,
            route: [
              omit(fromRoute, ["stops", "coordinates"]),
              omit(joinRoute, ["stops", "coordinates"]),
              omit(toRoute, ["stops", "coordinates"]),
            ],
            transitSteps: [
              {
                type: TransitType.TRANSIT,
                step: {
                  id: fromRoute.route_id,
                  color: fromRoute.color,
                  stops: fromStopRouteSlice,
                },
              },
              {
                type: TransitType.TRANSIT,
                step: {
                  id: joinRoute.route_id,
                  color: joinRoute.color,
                  stops: joinStopRouteSlice,
                },
              },
              {
                type: TransitType.TRANSIT,
                step: {
                  id: toRoute.route_id,
                  color: toRoute.color,
                  stops: toStopRouteSlice,
                },
              },
            ],
            coordinates: [
              fromRouteLineSlice,
              joinRouteLineSlice,
              toRouteLineSlice,
            ]
              .find((rf) => rf.id === routeId)
              ?.geometry.coordinates.map(([lng, lat]) => ({
                lng,
                lat,
              })) as ICoordinates[],
            distance: fromRouteLength + joinRouteLength + toRouteLength,
          });
        }
      }
    }

    return transitRoutes
      .sort((prev, next) => {
        const prevJoinCount = prev.id.split("-");
        const nextJoinCount = next.id.split("-");

        const prevDistance = prev.distance;
        const nextDistance = next.distance;

        // prioritize the routes with less join count
        if (
          prevJoinCount.length < nextJoinCount.length &&
          prevDistance > nextDistance
        ) {
          return -1;
        }

        return 1;
      })
      .slice(0, count);
  }
}
