from app.models.transport import TransportRoute
from app.schemas.transport import TransportRouteCreate, TransportRouteUpdate

async def create_transport_route(route_in: TransportRouteCreate) -> TransportRoute:
    route = TransportRoute(**route_in.model_dump())
    await route.insert()
    return route

async def get_transport_route(route_id: int) -> TransportRoute | None:
    return await TransportRoute.get(route_id)

async def get_transport_routes(skip: int = 0, limit: int = 100) -> list[TransportRoute]:
    return await TransportRoute.find_all().skip(skip).limit(limit).to_list()

async def update_transport_route(route: TransportRoute, route_in: TransportRouteUpdate) -> TransportRoute:
    for field, value in route_in.model_dump(exclude_unset=True).items():
        setattr(route, field, value)
    await route.save()
    return route

async def delete_transport_route(route: TransportRoute) -> None:
    await route.delete()
